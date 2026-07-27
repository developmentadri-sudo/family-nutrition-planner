const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
const times = { breakfast: '08:00', lunch: '13:30', snack: '17:00', dinner: '20:00' };
const planStart = new Date(2026, 6, 6);
const baseMeals = {
  breakfast: ['Lactose-free Greek Yogurt Bowl', 'Egg and Avocado Toast', 'Yogurt with Kiwi', 'Small Oat Porridge', 'Sourdough Toast with Cured Cheese', 'Spinach Omelette Toast', 'Yogurt with Strawberries', 'Banana Oat Bowl', 'Egg Toast with Tomato', 'Greek Yogurt with Walnuts', 'Kiwi Protein Bowl', 'Avocado Rice Cakes', 'Berry Yogurt Bowl', 'Soft Scrambled Eggs', 'Apple Cinnamon Porridge', 'Cottage Cheese Toast', 'Blueberry Kefir Bowl', 'Tuna and Tomato Toast', 'Peanut-free Seed Porridge', 'Turkey Toast', 'Strawberry Oat Bowl', 'Egg and Potato Tortilla Bite', 'Pear Yogurt Bowl', 'Hummus Toast', 'Rice Porridge with Banana', 'Cheese and Grape Toast', 'Protein Fruit Bowl', 'Vegetable Omelette'],
  lunch: ['Salmon Rice Bowl', 'Hake with Potatoes', 'Prawn Quinoa Bowl', 'Bonito Rice Plate', 'Cod Rice Plate', 'Salmon with Sweet Potato', 'Gluten-free Tuna Pasta', 'Chicken Rice Bowl', 'Turkey Potato Plate', 'Lentil Rice Bowl', 'Hake Quinoa Plate', 'Chicken Couscous Bowl', 'Tuna Sweet Potato Plate', 'Egg and Rice Bowl', 'Cod Potato Salad', 'Salmon Pasta Bowl', 'Chicken Quinoa Plate', 'Prawn Rice Noodles', 'Turkey Rice Bowl', 'White Fish with Pumpkin', 'Bonito Potato Bowl', 'Chickpea Rice Plate', 'Hake with Couscous', 'Chicken Pasta Bowl', 'Salmon Lentil Plate', 'Cod Rice Noodles', 'Turkey Sweet Potato Bowl', 'Egg Potato Salad'],
  snack: ['Kiwi and Walnuts', 'Strawberries', 'Walnuts and Blueberries', 'Cured Cheese and Grapes', 'Almonds and Orange', 'Kiwi', 'Banana Rice Cakes', 'Blueberries and Yogurt', 'Apple and Seed Butter', 'Grapes and Cheese', 'Orange and Walnuts', 'Pear and Kefir', 'Rice Cakes with Turkey', 'Strawberries and Seeds', 'Banana and Yogurt', 'Kiwi and Pumpkin Seeds', 'Blueberries and Almonds', 'Apple and Cured Cheese', 'Orange Rice Cakes', 'Pear and Walnuts', 'Grapes and Yogurt', 'Banana and Seeds', 'Kiwi and Cheese', 'Strawberries and Kefir', 'Blueberry Rice Cakes', 'Apple and Yogurt', 'Orange and Pumpkin Seeds', 'Pear and Cheese'],
  dinner: ['Spanish Potato Omelette', 'Vegetable Cream with Egg', 'Cod with Green Beans', 'Spinach Omelette', 'Pumpkin Vegetable Cream', 'Zucchini Omelette', 'Hake with Potatoes', 'Chicken Vegetable Soup', 'Rice Omelette with Spinach', 'Turkey and Pumpkin Plate', 'Cod Potato Omelette', 'Vegetable Cream with Hake', 'Salmon with Green Beans', 'Egg and Sweet Potato Plate', 'Chicken Rice Soup', 'Zucchini Cream with Egg', 'Hake Pumpkin Plate', 'Spinach Tortilla with Salad', 'Turkey Potato Omelette', 'Cod Vegetable Soup', 'Rice Bowl with Egg', 'Chicken Green Beans', 'Pumpkin Cream with Cod', 'Spanish Omelette with Spinach', 'Hake Rice Plate', 'Vegetable Soup with Turkey', 'Salmon Potato Plate', 'Egg and Zucchini Plate']
};
const vegetarianMeals = {
  breakfast: ['Lactose-free Greek Yogurt Bowl', 'Egg and Avocado Toast', 'Yogurt with Kiwi', 'Small Oat Porridge', 'Sourdough Toast with Cured Cheese', 'Spinach Omelette Toast', 'Yogurt with Strawberries', 'Banana Oat Bowl', 'Egg Toast with Tomato', 'Greek Yogurt with Walnuts', 'Kiwi Protein Bowl', 'Avocado Rice Cakes', 'Berry Yogurt Bowl', 'Soft Scrambled Eggs', 'Apple Cinnamon Porridge', 'Cottage Cheese Toast', 'Blueberry Kefir Bowl', 'Hummus Toast', 'Peanut-free Seed Porridge', 'Lentil Spread Toast', 'Strawberry Oat Bowl', 'Egg and Potato Tortilla Bite', 'Pear Yogurt Bowl', 'Hummus Toast', 'Rice Porridge with Banana', 'Cheese and Grape Toast', 'Protein Fruit Bowl', 'Vegetable Omelette'],
  lunch: ['Lentil Rice Bowl', 'Chickpea Quinoa Bowl', 'Egg and Rice Bowl', 'Tofu Rice Bowl', 'Bean Sweet Potato Plate', 'Vegetable Quinoa Bowl', 'Gluten-free Lentil Pasta', 'Chickpea Rice Plate', 'Egg Potato Salad', 'Lentil Potato Bowl', 'Tofu Quinoa Plate', 'Vegetable Couscous Bowl', 'Chickpea Sweet Potato Plate', 'Egg and Rice Bowl', 'Bean Potato Salad', 'Lentil Pasta Bowl', 'Tofu Quinoa Plate', 'Vegetable Rice Noodles', 'Chickpea Rice Bowl', 'Vegetable Pumpkin Plate', 'Bean Potato Bowl', 'Chickpea Rice Plate', 'Lentil Couscous Bowl', 'Vegetable Pasta Bowl', 'Lentil Sweet Potato Plate', 'Tofu Rice Noodles', 'Bean Sweet Potato Bowl', 'Egg Potato Salad'],
  snack: ['Kiwi and Walnuts', 'Strawberries', 'Walnuts and Blueberries', 'Cured Cheese and Grapes', 'Almonds and Orange', 'Kiwi', 'Banana Rice Cakes', 'Blueberries and Yogurt', 'Apple and Seed Butter', 'Grapes and Cheese', 'Orange and Walnuts', 'Pear and Kefir', 'Rice Cakes with Hummus', 'Strawberries and Seeds', 'Banana and Yogurt', 'Kiwi and Pumpkin Seeds', 'Blueberries and Almonds', 'Apple and Cured Cheese', 'Orange Rice Cakes', 'Pear and Walnuts', 'Grapes and Yogurt', 'Banana and Seeds', 'Kiwi and Cheese', 'Strawberries and Kefir', 'Blueberry Rice Cakes', 'Apple and Yogurt', 'Orange and Pumpkin Seeds', 'Pear and Cheese'],
  dinner: ['Spanish Potato Omelette', 'Vegetable Cream with Egg', 'Lentil Soup with Green Beans', 'Spinach Omelette', 'Pumpkin Vegetable Cream', 'Zucchini Omelette', 'Chickpea Potatoes', 'Vegetable Soup with Egg', 'Rice Omelette with Spinach', 'Bean and Pumpkin Plate', 'Lentil Potato Omelette', 'Vegetable Cream with Tofu', 'Chickpeas with Green Beans', 'Egg and Sweet Potato Plate', 'Vegetable Rice Soup', 'Zucchini Cream with Egg', 'Lentil Pumpkin Plate', 'Spinach Tortilla with Salad', 'Bean Potato Omelette', 'Chickpea Vegetable Soup', 'Rice Bowl with Egg', 'Tofu Green Beans', 'Pumpkin Cream with Lentils', 'Spanish Omelette with Spinach', 'Vegetable Rice Plate', 'Vegetable Soup with Beans', 'Lentil Potato Plate', 'Egg and Zucchini Plate']
};

export function createStarterPlan({ family, note = '', source = 'local' }) {
  const now = new Date().toISOString();
  const days = Array.from({ length: 28 }, (_, index) => {
    const dayNumber = index + 1;
    const label = dayLabel(dayNumber);
    return {
      id: `day-${dayNumber}`,
      dayNumber,
      label,
      meals: mealTypes.map(type => {
        const title = mealForFamily(type, index, family);
        return {
          id: `day-${dayNumber}-${type}`,
          type,
          time: times[type],
          title,
          description: describeMeal(title, type),
          reason: note ? `Starter plan shaped around: ${note}` : '',
          tags: inferTags(title),
          icon: mealIcon(title, type),
          memberNotes: createMemberNotes(family?.profiles || [], { title, type })
        };
      })
    };
  });

  return {
    id: `plan-${Date.now()}`,
    status: 'active',
    source,
    createdAt: now,
    updatedAt: now,
    summary: source === 'ai' ? 'AI generated plan.' : 'Local starter plan generated.',
    days
  };
}

export function mergeMealUpdate(plan, mealId, update) {
  return {
    ...plan,
    updatedAt: new Date().toISOString(),
    days: plan.days.map(day => ({
      ...day,
      meals: day.meals.map(meal => meal.id === mealId ? { ...meal, ...update, id: meal.id, type: meal.type } : meal)
    }))
  };
}

export function swapMeals(plan, mealId, targetMealId) {
  let sourceMeal = null;
  let targetMeal = null;
  for (const day of plan.days) {
    for (const meal of day.meals) {
      if (meal.id === mealId) sourceMeal = meal;
      if (meal.id === targetMealId) targetMeal = meal;
    }
  }
  if (!sourceMeal || !targetMeal || sourceMeal.type !== targetMeal.type) throw new Error('Meals must exist and share the same type.');
  return {
    ...plan,
    updatedAt: new Date().toISOString(),
    days: plan.days.map(day => ({
      ...day,
      meals: day.meals.map(meal => {
        if (meal.id === mealId) return withSwapMemory(targetMeal, sourceMeal);
        if (meal.id === targetMealId) return withSwapMemory(sourceMeal, targetMeal);
        return meal;
      })
    }))
  };
}

function withSwapMemory(incomingMeal, displacedMeal) {
  return {
    ...incomingMeal,
    id: displacedMeal.id,
    type: displacedMeal.type,
    time: displacedMeal.time,
    swappedFromTitle: displacedMeal.title,
    previousTitles: uniqueTitles([...(incomingMeal.previousTitles || []), incomingMeal.title, displacedMeal.title, ...(displacedMeal.previousTitles || [])])
  };
}

function uniqueTitles(titles) {
  return [...new Set(titles.filter(Boolean))].slice(-8);
}

export function validatePlan(plan) {
  if (!plan || !Array.isArray(plan.days)) throw new Error('Plan must include days.');
  for (const day of plan.days) {
    if (!day.dayNumber || !Array.isArray(day.meals)) throw new Error('Each day must include dayNumber and meals.');
    for (const meal of day.meals) {
      if (!mealTypes.includes(meal.type) || !meal.title) throw new Error('Each meal needs a valid type and title.');
    }
  }
  return plan;
}

export function sanitizePlanForFamily(plan, family) {
  if (!plan?.days) return plan;
  const profiles = family?.profiles || [];
  return {
    ...plan,
    days: plan.days.map(day => ({
      ...day,
      meals: day.meals.map(meal => {
        if (allowedForFamily(meal.title, profiles)) return meal;
        const title = mealForFamily(meal.type, day.dayNumber - 1, family);
        return {
          ...meal,
          title,
          description: describeMeal(title, meal.type),
          reason: 'Adjusted for household diet restrictions.',
          tags: inferTags(title),
          icon: mealIcon(title, meal.type),
          memberNotes: createMemberNotes(profiles, { title, type: meal.type })
        };
      })
    }))
  };
}

export function createMemberNotes(profiles, meal) {
  return profiles.map(profile => ({
    profileId: profile.id,
    name: profile.name,
    note: profileMealNote(profile, meal)
  }));
}

function profileMealNote(profile, meal) {
  const context = `${profile.goal || ''} ${profile.restrictions || ''} ${profile.activities || ''} ${profile.preferences || ''}`.toLowerCase();
  const title = (meal.title || '').toLowerCase();
  const notes = [];
  const alternative = alternativeForProfile(profile, meal);

  if (alternative) notes.push(alternative);

  if (/lactose|dairy/.test(context) && /yogurt|cheese|milk/.test(title)) notes.push(dairySwapForMeal(title));
  if (/gluten|celiac/.test(context) && /toast|bread|pasta|sourdough/.test(title)) notes.push(glutenSwapForMeal(title));
  if (/nut|walnut|almond/.test(context) && /walnut|almond|nuts/.test(title)) notes.push(nutSwapForMeal(title));
  if (/fish|seafood/.test(context) && /salmon|hake|cod|prawn|bonito|tuna/.test(title)) notes.push('Replace fish with eggs, tofu or legumes.');
  if (/egg/.test(context) && /egg|omelette/.test(title)) notes.push('Use tofu scramble or a fish/chicken portion instead.');
  if (/gut|reflux|gallbladder|bloat/.test(context)) notes.push(gutNoteForMeal(title, meal.type));
  if (/performance|basketball|padel|gym|active|training|run/.test(context)) notes.push(performanceNoteForMeal(title, meal.type));
  if (/weight|lean|lose/.test(context)) notes.push(weightNoteForMeal(title, meal.type));
  if (/hair/.test(context)) notes.push(hairNoteForMeal(title, meal.type));

  return notes.slice(0, 3).join(' ') || 'Family default: adjust portion to appetite, goal and activity.';
}

function dairySwapForMeal(title) {
  if (/yogurt|kefir/i.test(title)) return 'Use lactose-free Greek yogurt or soy yogurt; keep the same fruit topping.';
  if (/cheese/i.test(title)) return 'Use lactose-free cheese or replace it with egg, hummus or tofu.';
  return 'Use lactose-free dairy or a non-dairy base.';
}

function glutenSwapForMeal(title) {
  if (/toast|sourdough|bread/i.test(title)) return 'Use gluten-free toast and keep the same toppings.';
  if (/pasta/i.test(title)) return 'Use gluten-free pasta and keep the same sauce/protein.';
  return 'Use the gluten-free version of the carb base.';
}

function nutSwapForMeal(title) {
  if (/walnut|almond/i.test(title)) return 'Swap nuts for pumpkin seeds, chia or extra berries.';
  return 'Replace nuts with seeds or fruit.';
}

function gutNoteForMeal(title, type) {
  if (/salmon|hake|cod|tuna|bonito/i.test(title)) return 'Keep the fish portion moderate, choose plain rice or potato, and add cucumber, carrots or zucchini instead of heavy sauces.';
  if (/omelette|egg/i.test(title)) return 'Keep the omelette lightly cooked with spinach or zucchini; avoid onion-heavy sides.';
  if (/yogurt|kefir/i.test(title)) return 'Use lactose-free yogurt, keep berries moderate, and skip extra nuts if digestion feels sensitive.';
  if (type === 'snack') return 'Keep the snack simple: fruit first, with seeds or nuts only if well tolerated.';
  return 'Keep seasoning gentle, fat moderate, and add a cooked vegetable side.';
}

function performanceNoteForMeal(title, type) {
  if (/rice|potato|pasta|toast|oat|porridge/i.test(title)) return 'Keep the carb base; add a little extra rice, potato or toast when training is within a few hours.';
  if (/salmon|hake|cod|egg|tofu|lentil|chickpea|bean/i.test(title)) return 'Keep the protein, and pair it with rice, potato or bread if this is close to training.';
  if (type === 'snack') return 'Use this as a pre-session bite: banana, rice cakes or fruit work better than a heavy portion.';
  return 'Add an easy carb side if this is near training.';
}

function weightNoteForMeal(title, type) {
  if (/rice|pasta|potato/i.test(title)) return 'Keep the same dish, but use a smaller carb portion and add extra vegetables or salad.';
  if (/yogurt|snack/i.test(`${title} ${type}`)) return 'Keep protein steady and use fruit as the main add-on, with nuts measured.';
  return 'Keep protein central, double the vegetables, and moderate added fats.';
}

function hairNoteForMeal(title, type) {
  if (/salmon|tuna|bonito/i.test(title)) return 'Pair the fish with strawberries, kiwi or blueberries for vitamin C; add walnuts only if tolerated.';
  if (/egg|omelette/i.test(title)) return 'Add spinach or tomato on the side, plus kiwi or berries later in the day.';
  if (/yogurt|kefir/i.test(title)) return 'Use berries or kiwi as the topping, with chia or walnuts if tolerated.';
  if (/walnut|almond|nuts/i.test(title)) return 'Keep the nuts portion and pair it with kiwi, strawberries or blueberries.';
  if (type === 'snack') return 'Choose fruit with seeds or walnuts to support micronutrients without making it heavy.';
  return 'Add vitamin-C fruit and a tolerated omega-rich topping or seed side.';
}

function alternativeForProfile(profile, meal) {
  const context = `${profile.goal || ''} ${profile.restrictions || ''} ${profile.activities || ''} ${profile.preferences || ''}`.toLowerCase();
  const title = String(meal.title || '');
  const type = meal.type || 'lunch';
  const diet = profileDietMode(context);
  const hasFish = /salmon|hake|cod|prawn|bonito|tuna|fish|seafood/i.test(title);
  const hasMeat = /chicken|turkey|meat|beef|pork|ham/i.test(title);
  const hasEggDairy = /egg|omelette|yogurt|cheese|milk|kefir/i.test(title);
  const wantsMeat = /meat|chicken|turkey|animal protein/.test(context) && diet === 'omnivore';

  if (diet === 'vegan' && (hasFish || hasMeat || hasEggDairy)) {
    return `Use ${veganAlternative(title, type)} for this profile, keeping the same base and timing.`;
  }
  if (diet === 'vegetarian' && (hasFish || hasMeat)) {
    return `Use ${vegetarianAlternative(title, type)} for this profile, keeping the same base and timing.`;
  }
  if (diet === 'pescetarian' && hasMeat) {
    return `Use ${pescetarianAlternative(title, type)} for this profile, keeping the same base and timing.`;
  }
  if (wantsMeat && !hasFish && !hasMeat && /lentil|chickpea|bean|tofu|egg|vegetable|rice|quinoa|potato|pasta/i.test(title)) {
    return `Optional add-on: chicken or turkey portion for this profile, while the family base stays ${title}.`;
  }
  return '';
}

function profileDietMode(context) {
  if (/vegan/.test(context)) return 'vegan';
  if (/vegetarian/.test(context)) return 'vegetarian';
  if (/pescetarian/.test(context)) return 'pescetarian';
  return 'omnivore';
}

function veganAlternative(title, type) {
  if (/rice/i.test(title)) return 'tofu rice bowl';
  if (/quinoa/i.test(title)) return 'chickpea quinoa bowl';
  if (/potato/i.test(title)) return 'bean potato plate';
  if (/pasta/i.test(title)) return 'lentil pasta bowl';
  if (type === 'breakfast') return 'soy yogurt bowl or oat porridge';
  if (type === 'snack') return 'fruit with seeds';
  return 'tofu or legumes';
}

function vegetarianAlternative(title, type) {
  if (/rice/i.test(title)) return 'tofu or egg rice bowl';
  if (/quinoa/i.test(title)) return 'chickpea quinoa bowl';
  if (/potato/i.test(title)) return 'egg or bean potato plate';
  if (/pasta/i.test(title)) return 'lentil pasta bowl';
  if (type === 'snack') return 'cheese, yogurt, fruit or seeds';
  return 'eggs, tofu or legumes';
}

function pescetarianAlternative(title, type) {
  if (/rice/i.test(title)) return 'salmon or tuna rice bowl';
  if (/potato/i.test(title)) return 'hake potato plate';
  if (type === 'snack') return 'fruit, yogurt or seeds';
  return 'fish, eggs or legumes';
}

function describeMeal(title, type) {
  if (/lentil|chickpea|bean|tofu/i.test(title)) return 'Vegetarian family base with protein, carbs and gentle add-ons by profile.';
  if (/salmon|hake|cod|prawn|bonito/i.test(title)) return 'Shared Mediterranean fish base with adjustable carbohydrates and vegetables.';
  if (/yogurt/i.test(title)) return 'Simple high-protein breakfast with fruit and tolerance-friendly add-ons.';
  if (/egg|omelette/i.test(title)) return 'Flexible egg-based meal that can be adapted by portion and side dish.';
  if (type === 'snack') return 'Portable family snack with easy individual swaps.';
  return 'Shared family meal with per-member portions and add-ons.';
}

function mealForFamily(type, index, family) {
  const mode = householdDietMode(family?.profiles || []);
  const pool = mode === 'vegetarian' || mode === 'vegan' ? vegetarianMeals[type] : baseMeals[type];
  let title = pool[index % pool.length];
  if (mode !== 'omnivore' && /chicken|turkey/i.test(title)) title = vegetarianMeals[type][index % vegetarianMeals[type].length];
  if ((mode === 'vegetarian' || mode === 'vegan') && /salmon|hake|cod|prawn|bonito|tuna|fish|seafood/i.test(title)) title = vegetarianMeals[type][index % vegetarianMeals[type].length];
  return title;
}

function householdDietMode(profiles) {
  if (!profiles.length) return 'omnivore';
  const modes = profiles.map(profile => profileDietMode(`${profile.goal || ''} ${profile.restrictions || ''} ${profile.preferences || ''}`.toLowerCase()));
  if (modes.every(mode => mode === 'vegan')) return 'vegan';
  if (modes.every(mode => mode === 'vegan' || mode === 'vegetarian')) return 'vegetarian';
  if (modes.every(mode => mode === 'vegan' || mode === 'vegetarian' || mode === 'pescetarian')) return 'pescetarian';
  return 'omnivore';
}

function allowedForFamily(title, profiles) {
  const mode = householdDietMode(profiles);
  const text = String(title || '').toLowerCase();
  if (mode === 'vegetarian' || mode === 'vegan') return !/chicken|turkey|meat|salmon|hake|cod|prawn|bonito|tuna|fish|seafood/.test(text);
  if (mode === 'pescetarian') return !/chicken|turkey|meat/.test(text);
  return true;
}

export function normalizeAiPlan(aiPlan, fallbackPlan) {
  const byDay = new Map((aiPlan?.days || []).map(day => [Number(day.dayNumber), day]));
  return validatePlan({
    ...fallbackPlan,
    summary: aiPlan?.summary || fallbackPlan.summary,
    days: fallbackPlan.days.map(day => {
      const aiDay = byDay.get(day.dayNumber);
      if (!aiDay) return day;
      const byType = new Map((aiDay.meals || []).map(meal => [meal.type, meal]));
      return {
        ...day,
        label: aiDay.label || day.label,
        meals: day.meals.map(meal => {
          const next = byType.get(meal.type);
          if (!next?.title) return meal;
          return {
            ...meal,
            ...next,
            id: meal.id,
            type: meal.type,
            time: next.time || meal.time,
            tags: next.tags || inferTags(next.title),
            icon: next.icon || mealIcon(next.title, meal.type)
          };
        })
      };
    })
  });
}

function dayLabel(dayNumber) {
  const date = new Date(planStart);
  date.setDate(planStart.getDate() + dayNumber - 1);
  const dow = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dow} ${dd}/${mm}`;
}

export function inferTags(title) {
  const text = title.toLowerCase();
  const tags = [];
  if (/salmon|hake|cod|prawn|bonito|tuna|egg|yogurt|cheese/.test(text)) tags.push({ label: 'Protein', tone: 'blue' });
  if (/rice|potato|quinoa|pasta|bread|toast|oat|porridge/.test(text)) tags.push({ label: 'Carbs', tone: 'orange' });
  if (/salmon|walnut|blueberry|kiwi|spinach|egg/.test(text)) tags.push({ label: 'Hair support', tone: 'green' });
  if (!/tomato|onion|garlic|coffee/.test(text)) tags.push({ label: 'Gut-safe base', tone: 'purple' });
  return tags.slice(0, 3);
}

export function mealIcon(title, type) {
  const text = title.toLowerCase();
  if (/yogurt|kiwi|strawberry|blueberry/.test(text)) return 'bowl';
  if (/egg|omelette/.test(text)) return 'egg';
  if (/salmon|hake|cod|prawn|bonito|tuna/.test(text)) return 'fish';
  if (/rice|quinoa/.test(text)) return 'rice';
  if (/potato/.test(text)) return 'potato';
  if (/walnut|almond/.test(text)) return 'nuts';
  return type === 'snack' ? 'fruit' : 'plate';
}
