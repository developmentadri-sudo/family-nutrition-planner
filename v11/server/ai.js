import { createMemberNotes, createStarterPlan, inferTags, mealIcon, mergeMealUpdate, normalizeAiPlan, sanitizePlanForFamily } from './schema.js';

const endpoint = 'https://api.openai.com/v1/responses';
const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

export async function generatePlanWithAi(payload) {
  if (!process.env.OPENAI_API_KEY) {
    const plan = createStarterPlan({ ...payload, source: 'local' });
    return { aiUsed: false, plan: sanitizePlanForFamily(plan, payload.family) };
  }

  const prompt = buildPlanPrompt(payload);
  const json = await callOpenAI(prompt);
  const fallbackPlan = createStarterPlan({ ...payload, source: 'ai' });
  const plan = normalizeAiPlan({
    ...fallbackPlan,
    ...json,
    id: `plan-${Date.now()}`,
    source: 'ai',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, fallbackPlan);
  return { aiUsed: true, plan: sanitizePlanForFamily(plan, payload.family) };
}

export async function adaptMealWithAi(plan, mealId, payload) {
  const meal = plan.days.flatMap(day => day.meals).find(item => item.id === mealId);
  if (!meal) throw new Error('Meal not found.');

  if (isSmallMealEdit(payload.note || '')) {
    return {
      aiUsed: false,
      plan: mergeMealUpdate(plan, mealId, createSmallMealEdit(meal, payload, payload.note || 'make a small adjustment', payload.family?.profiles || []))
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      aiUsed: false,
      plan: mergeMealUpdate(plan, mealId, createLocalMealUpdate(meal, payload))
    };
  }

  const prompt = buildMealPrompt(plan, meal, payload);
  const update = await callOpenAI(prompt);
  const memberTimings = createMemberTimings(meal, payload);
  return {
    aiUsed: true,
    plan: mergeMealUpdate(plan, mealId, {
      ...update,
      memberTimings,
      tags: update.tags || inferTags(update.title || meal.title),
      icon: update.icon || mealIcon(update.title || meal.title, meal.type),
      memberNotes: update.memberNotes || createMemberNotes(payload.family?.profiles || [], { ...meal, ...update })
    })
  };
}

export async function adaptDayWithAi(plan, dayNumber, payload) {
  const day = plan.days.find(item => Number(item.dayNumber) === Number(dayNumber));
  if (!day) throw new Error('Day not found.');

  let nextPlan = plan;
  let aiUsed = false;
  for (const meal of day.meals) {
    const result = await adaptMealWithAi(nextPlan, meal.id, {
      ...payload,
      note: payload.note || 'Adapt the whole day around the scheduled events, timing conflicts and profile needs.'
    });
    nextPlan = result.plan;
    aiUsed = aiUsed || result.aiUsed;
  }
  return { aiUsed, plan: nextPlan };
}

async function callOpenAI(prompt) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: 'Return only valid JSON for a family nutrition planner. Do not include diagnosis.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `OpenAI request failed with ${response.status}`);
  const text = data.output_text || data.output?.flatMap(item => item.content || []).map(item => item.text || '').join('') || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response did not include JSON.');
  return JSON.parse(match[0]);
}

function buildPlanPrompt({ family, note }) {
  return `Create a complete 28-day shared family nutrition plan. Include all 28 days and all four meal types per day.
Return JSON with: {"summary":"...","days":[{"dayNumber":1,"label":"MON 06/07","meals":[{"type":"breakfast","time":"08:00","title":"...","description":"...","reason":"...","tags":[{"label":"Protein","tone":"blue"}],"icon":"bowl","memberNotes":[{"profileId":"...","name":"...","note":"..."}]}]}]}.
Respect vegetarian, vegan, pescetarian, allergy and intolerance restrictions across the whole family. If any shared family profile is vegetarian or vegan, do not include chicken, turkey, meat, fish or seafood. If pescetarian, do not include chicken, turkey or meat.
Profiles: ${JSON.stringify(family?.profiles || [])}
Request: ${note || 'Create the first balanced routine.'}`;
}

function buildMealPrompt(plan, meal, payload) {
  const { family, note } = payload;
  return `Adapt one meal and return JSON with {"title":"...","description":"...","reason":"...","time":"08:00","memberTimings":[{"profileId":"...","name":"...","time":"08:00","note":"..."}],"tags":[{"label":"Protein","tone":"blue"}],"icon":"bowl","memberNotes":[{"profileId":"...","name":"...","note":"..."}]}.
Current meal: ${JSON.stringify(meal)}
Current day context: ${JSON.stringify(plan.days.find(day => day.meals.some(item => item.id === meal.id)))}
Profiles: ${JSON.stringify(family?.profiles || [])}
Scheduled events: ${JSON.stringify(payloadActivitiesForMeal(plan, meal, { activities: payload.activities || [] }))}
Respect vegetarian, vegan, pescetarian, allergy and intolerance restrictions. If the family is vegetarian or vegan, do not return chicken, turkey, meat, fish or seafood. If pescetarian, do not return chicken, turkey or meat.
User request: ${note || 'Adapt this meal while preserving the family routine.'}`;
}

function createLocalMealUpdate(meal, payload) {
  const note = payload.note || 'make this meal easier for today';
  const profiles = payload.family?.profiles || [];
  if (isSmallMealEdit(note)) return createSmallMealEdit(meal, payload, note, profiles);
  const title = chooseLocalTitle(meal, note, payload.family);
  return {
    title,
    description: describeLocalAdaptation(title, meal.type),
    reason: `Changed this ${meal.type} because: ${note}`,
    memberTimings: createMemberTimings(meal, payload),
    tags: inferTags(title),
    icon: mealIcon(title, meal.type),
    memberNotes: createMemberNotes(profiles, { ...meal, title }),
    previousTitles: uniqueTitles([...(meal.previousTitles || []), meal.title, meal.swappedFromTitle, title])
  };
}

function isSmallMealEdit(note) {
  return /\b(add|extra|more|include|with|side|side dish|veggies|vegetables|greens|salad|fruit|seeds|nuts|sauce|topping|portion|smaller|bigger|less|only|slight|slightly|keep|same|main shape)\b/i.test(note);
}

function createSmallMealEdit(meal, payload, note, profiles) {
  const addition = sideDishPhrase(meal, note);
  const description = withSentence(
    meal.description || describeLocalAdaptation(meal.title, meal.type),
    addition
  );
  return {
    title: meal.title,
    description,
    reason: `Adjusted this ${meal.type}: ${note}`,
    memberTimings: createMemberTimings(meal, payload),
    tags: meal.tags?.length ? meal.tags : inferTags(meal.title),
    icon: meal.icon || mealIcon(meal.title, meal.type),
    memberNotes: createMemberNotes(profiles, meal),
    previousTitles: uniqueTitles([...(meal.previousTitles || []), meal.title, meal.swappedFromTitle])
  };
}

function sideDishPhrase(meal, note) {
  const text = note.toLowerCase();
  if (/veggie|vegetable|greens|salad/.test(text)) return vegetablePairingForMeal(meal);
  if (/fruit|berry|banana|kiwi|apple/.test(text)) return fruitPairingForMeal(meal);
  if (/seed|nut|walnut|almond/.test(text)) return toppingPairingForMeal(meal);
  if (/portion|smaller|bigger|less|more/.test(text)) return 'Adjust portions by person while keeping the recipe structure unchanged.';
  if (/side/.test(text)) return sidePairingForMeal(meal);
  return 'Make a small adjustment and keep the main meal unchanged.';
}

function vegetablePairingForMeal(meal) {
  const title = String(meal.title || '').toLowerCase();
  if (/prawn|shrimp/.test(title) && /quinoa/.test(title)) return 'Add roasted broccoli or green beans with lemon; they pair well with prawns and keep the quinoa bowl balanced.';
  if (/prawn|shrimp/.test(title)) return 'Add zucchini ribbons or green beans with lemon and olive oil to keep the prawn dish light.';
  if (/salmon|tuna|bonito/.test(title)) return 'Add cucumber, steamed green beans or roasted zucchini; they balance oily fish without making the meal heavy.';
  if (/hake|cod|white fish/.test(title)) return 'Add carrots, zucchini or green beans; mild vegetables keep the white fish gentle and complete.';
  if (/egg|omelette|tortilla/.test(title)) return 'Add spinach and tomato, or zucchini on the side; they fit the egg base without changing the dish.';
  if (/rice/.test(title)) return 'Add sauteed zucchini, carrots or spinach into the rice base for color, fiber and easy digestion.';
  if (/potato/.test(title)) return 'Add green beans or a simple tomato-cucumber salad to lighten the potato base.';
  if (/lentil|chickpea|bean/.test(title)) return 'Add roasted carrots, zucchini or spinach; they soften the legume bowl and add freshness.';
  if (/toast|avocado/.test(title)) return 'Add tomato and spinach on the toast, or cucumber on the side for a fresh vegetable layer.';
  if (/yogurt|porridge|oat/.test(title)) return 'Vegetables do not fit this meal naturally; choose berries or kiwi instead, or add cucumber/tomato later with lunch.';
  return 'Add zucchini, spinach or green beans as the vegetable side; they pair broadly and keep the meal balanced.';
}

function fruitPairingForMeal(meal) {
  const title = String(meal.title || '').toLowerCase();
  if (/salmon|tuna|bonito|prawn|hake|cod/.test(title)) return 'Pair it with kiwi, strawberries or blueberries for a fresh vitamin-C side that works well with fish.';
  if (/egg|omelette|toast/.test(title)) return 'Add kiwi or berries on the side; they keep the meal light and add freshness.';
  if (/yogurt|kefir|porridge|oat/.test(title)) return 'Use blueberries, kiwi or strawberries as the topping instead of changing the base.';
  return 'Add kiwi, berries or orange as the fruit side; keep it small so the meal stays balanced.';
}

function toppingPairingForMeal(meal) {
  const title = String(meal.title || '').toLowerCase();
  if (/yogurt|kefir|porridge|oat/.test(title)) return 'Use chia, pumpkin seeds or walnuts as the topping if tolerated.';
  if (/salmon|tuna|bonito/.test(title)) return 'Add a small walnut or seed topping only if tolerated; keep it modest with oily fish.';
  if (/salad|quinoa|rice/.test(title)) return 'Add pumpkin seeds or sesame as a light topping for texture without changing the bowl.';
  return 'Add tolerated seeds or a small nut portion as the topping while keeping the main meal structure.';
}

function sidePairingForMeal(meal) {
  const title = String(meal.title || '').toLowerCase();
  if (/prawn|shrimp|salmon|hake|cod|tuna|bonito/.test(title)) return 'Use green beans, zucchini or cucumber salad as the side; these pair cleanly with seafood and fish.';
  if (/egg|omelette|tortilla/.test(title)) return 'Use spinach, tomato or zucchini as the side so the egg dish stays familiar.';
  if (/lentil|chickpea|bean|tofu/.test(title)) return 'Use carrots, spinach or roasted zucchini as the side to balance the legume base.';
  if (/toast|avocado/.test(title)) return 'Use tomato, cucumber or spinach as the side for a fresh, simple plate.';
  return vegetablePairingForMeal(meal);
}

function withSentence(description, sentence) {
  const base = String(description || '').trim();
  if (!base) return sentence;
  return base.includes(sentence) ? base : `${base} ${sentence}`;
}

function chooseLocalTitle(meal, note, family) {
  const text = note.toLowerCase();
  const mode = householdDietMode(family?.profiles || []);
  const alternatives = mode === 'vegetarian' || mode === 'vegan' ? vegetarianAlternatives() : {
    breakfast: {
      noDairy: 'Egg and Avocado Toast',
      noGluten: 'Lactose-free Yogurt with Kiwi',
      active: 'Oat Porridge with Banana',
      light: 'Yogurt with Strawberries',
      default: 'Lactose-free Greek Yogurt Bowl'
    },
    lunch: {
      noFish: 'Chicken Rice Bowl',
      noGluten: 'Salmon Rice Bowl',
      active: 'Salmon Rice Bowl with Extra Potatoes',
      light: 'Hake with Green Beans',
      default: 'Prawn Quinoa Bowl'
    },
    snack: {
      noNuts: 'Kiwi and Cured Cheese',
      noDairy: 'Fruit and Pumpkin Seeds',
      active: 'Banana and Rice Cakes',
      light: 'Strawberries',
      default: 'Kiwi and Walnuts'
    },
    dinner: {
      noFish: 'Spanish Potato Omelette',
      noGluten: 'Cod with Green Beans',
      active: 'Rice Omelette with Spinach',
      light: 'Vegetable Cream with Egg',
      default: 'Zucchini Omelette'
    }
  };
  if (mode === 'pescetarian') {
    alternatives.lunch.noFish = 'Chickpea Quinoa Bowl';
    alternatives.lunch.default = 'Prawn Quinoa Bowl';
    alternatives.dinner.noFish = 'Spanish Potato Omelette';
    alternatives.dinner.default = 'Zucchini Omelette';
  }
  const set = alternatives[meal.type] || alternatives.lunch;
  const candidates = uniqueTitles(Object.values(set)).filter(title => allowedForDiet(title, mode));
  const avoid = [meal.title, meal.swappedFromTitle, ...(meal.previousTitles || [])];
  if (/no dairy|avoid dairy|lactose|milk|cheese|yogurt/.test(text)) return differentMeal(avoid, set.noDairy, candidates);
  if (/no gluten|gluten|celiac|bread|pasta/.test(text)) return differentMeal(avoid, set.noGluten, candidates);
  if (/no fish|avoid fish|salmon|hake|cod|tuna|bonito|prawn/.test(text)) return differentMeal(avoid, set.noFish, candidates);
  if (/no nut|nut|walnut|almond/.test(text)) return differentMeal(avoid, set.noNuts, candidates);
  if (/active|training|basketball|padel|gym|run|game|carb|performance/.test(text)) return differentMeal(avoid, set.active, candidates);
  if (/light|reflux|gut|bloat|tired|late|small/.test(text)) return differentMeal(avoid, set.light, candidates);
  return candidates.find(candidate => !avoid.some(title => sameMeal(candidate, title))) || candidates.find(candidate => !sameMeal(candidate, meal.title)) || candidates[0] || set.default;
}

function describeLocalAdaptation(title, type) {
  if (/lentil|chickpea|bean|tofu|hummus/i.test(title)) return 'Vegetarian family meal with protein, carbs and gentle add-ons scaled by profile.';
  if (/chicken|salmon|hake|cod|prawn|tuna|bonito/i.test(title)) return 'Shared protein-focused meal with portions and sides adjusted per profile.';
  if (/oat|rice|potato|banana|toast|pasta/i.test(title)) return 'Higher-energy option for activity, with carb portions scaled by person.';
  if (/vegetable cream|green beans|strawberries|kiwi/i.test(title)) return 'Gentler option with simple ingredients and easy tolerance adjustments.';
  if (type === 'snack') return 'Simple snack adapted around availability, activity and restrictions.';
  return 'Adjusted family meal with member-specific portions and ingredient swaps.';
}

function vegetarianAlternatives() {
  return {
    breakfast: {
      noDairy: 'Egg and Avocado Toast',
      noGluten: 'Lactose-free Yogurt with Kiwi',
      active: 'Oat Porridge with Banana',
      light: 'Yogurt with Strawberries',
      default: 'Vegetable Omelette'
    },
    lunch: {
      noFish: 'Chickpea Quinoa Bowl',
      noGluten: 'Lentil Rice Bowl',
      active: 'Bean Sweet Potato Plate',
      light: 'Vegetable Quinoa Bowl',
      default: 'Lentil Rice Bowl'
    },
    snack: {
      noNuts: 'Kiwi and Cured Cheese',
      noDairy: 'Fruit and Pumpkin Seeds',
      active: 'Banana and Rice Cakes',
      light: 'Strawberries',
      default: 'Kiwi and Walnuts'
    },
    dinner: {
      noFish: 'Spanish Potato Omelette',
      noGluten: 'Chickpeas with Green Beans',
      active: 'Rice Omelette with Spinach',
      light: 'Vegetable Cream with Tofu',
      default: 'Zucchini Omelette'
    }
  };
}

function householdDietMode(profiles) {
  const text = profiles.map(profile => `${profile.goal || ''} ${profile.restrictions || ''} ${profile.preferences || ''}`).join(' ').toLowerCase();
  if (/vegan/.test(text)) return 'vegan';
  if (/vegetarian/.test(text)) return 'vegetarian';
  if (/pescetarian/.test(text)) return 'pescetarian';
  return 'omnivore';
}

function allowedForDiet(title, mode) {
  const text = title.toLowerCase();
  if (mode === 'vegetarian' || mode === 'vegan') return !/chicken|turkey|meat|salmon|hake|cod|prawn|bonito|tuna|fish|seafood/.test(text);
  if (mode === 'pescetarian') return !/chicken|turkey|meat/.test(text);
  return true;
}

function createMemberTimings(meal, payload) {
  const profiles = payload.family?.profiles || [];
  const dayNumber = Number(meal.id.match(/^day-(\d+)-/)?.[1]);
  const events = [
    ...payloadActivitiesForMeal(null, meal, { activities: payload.activities || [], dayNumber }),
    ...eventsFromNote(payload.note || '', profiles, dayNumber)
  ];
  if (!profiles.length) return [];

  const timings = profiles.map(profile => {
    const event = events.find(item => sameProfileEvent(item, profile));
    if (!event) return { profileId: profile.id, name: profile.name, time: meal.time, note: 'Family default.' };
    const mealMinutes = toMinutes(meal.time);
    const eventMinutes = toMinutes(event.time);
    const delta = eventMinutes - mealMinutes;
    if (meal.type === 'breakfast' && delta >= 0 && delta <= 90) {
      return { profileId: profile.id, name: profile.name, time: fromMinutes(Math.max(390, eventMinutes + 45)), note: `After ${event.type}; add a small pre-activity bite if needed.` };
    }
    if (meal.type === 'dinner' && delta >= -60 && delta <= 90) {
      return { profileId: profile.id, name: profile.name, time: delta < 45 ? fromMinutes(eventMinutes + 75) : fromMinutes(mealMinutes - 30), note: `Adjusted around ${event.type}.` };
    }
    if (Math.abs(delta) <= 75) {
      return { profileId: profile.id, name: profile.name, time: fromMinutes(delta > 0 ? mealMinutes - 45 : eventMinutes + 45), note: `Moved away from ${event.type}.` };
    }
    return { profileId: profile.id, name: profile.name, time: meal.time, note: 'Family default.' };
  });

  return timings.some(item => item.time !== meal.time || item.note !== 'Family default.') ? timings : [];
}

function payloadActivitiesForMeal(plan, meal, { activities = [], dayNumber } = {}) {
  const mealDay = dayNumber || Number(meal.id.match(/^day-(\d+)-/)?.[1]);
  return activities.filter(activity => Number(activity.dayNumber) === mealDay);
}

function sameProfileEvent(event, profile) {
  if (event.profileId && event.profileId === profile.id) return true;
  return normalizeName(event.profileName) && normalizeName(event.profileName) === normalizeName(profile.name);
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function eventsFromNote(note, profiles, dayNumber) {
  const text = note.toLowerCase();
  if (!/gym|basketball|padel|training|game|run|exercise/.test(text)) return [];
  const time = parseTime(text);
  if (!time) return [];
  const activityType = text.match(/gym|basketball|padel|training|game|run|exercise/)?.[0] || 'Activity';
  const profile = profiles.find(item => item.name && text.includes(item.name.toLowerCase())) || profiles[0];
  return profile ? [{ dayNumber, profileId: profile.id, profileName: profile.name, type: activityType, time }] : [];
}

function parseTime(text) {
  const colon = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (colon) return `${colon[1].padStart(2, '0')}:${colon[2]}`;
  const h = text.match(/\b([01]?\d|2[0-3])\s*h\b/);
  if (h) return `${h[1].padStart(2, '0')}:00`;
  const ampm = text.match(/\b(1[0-2]|0?\d)\s*(a\.?m\.?|p\.?m\.?)\b/);
  if (ampm) {
    let hours = Number(ampm[1]);
    if (ampm[2].startsWith('p') && hours < 12) hours += 12;
    if (ampm[2].startsWith('a') && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:00`;
  }
  const plain = text.match(/\bat\s+([01]?\d|2[0-3])\b/);
  return plain ? `${plain[1].padStart(2, '0')}:00` : '';
}

function toMinutes(time) {
  const [hours, minutes] = String(time || '00:00').split(':').map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(value) {
  const safe = Math.max(360, Math.min(1410, value));
  const hours = String(Math.floor(safe / 60)).padStart(2, '0');
  const minutes = String(safe % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function sameMeal(a, b) {
  return String(a || '').toLowerCase().replace(/\s+variation\b/g, '').trim() === String(b || '').toLowerCase().replace(/\s+variation\b/g, '').trim();
}

function differentMeal(avoid, preferred, candidates) {
  if (preferred && !avoid.some(title => sameMeal(preferred, title))) return preferred;
  return candidates.find(candidate => !avoid.some(title => sameMeal(candidate, title))) || candidates.find(candidate => !sameMeal(candidate, avoid[0])) || preferred;
}

function uniqueTitles(titles) {
  return [...new Set(titles.filter(Boolean))].slice(-8);
}
