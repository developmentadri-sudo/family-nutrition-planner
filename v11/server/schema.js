const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
const times = { breakfast: '08:00', lunch: '13:30', snack: '17:00', dinner: '20:00' };
const planStart = new Date(2026, 6, 6);
const baseMeals = {
  breakfast: ['Lactose-free Greek Yogurt Bowl', 'Egg and Avocado Toast', 'Yogurt with Kiwi', 'Small Oat Porridge', 'Sourdough Toast with Cured Cheese', 'Spinach Omelette Toast', 'Yogurt with Strawberries', 'Banana Oat Bowl', 'Egg Toast with Tomato', 'Greek Yogurt with Walnuts', 'Kiwi Protein Bowl', 'Avocado Rice Cakes', 'Berry Yogurt Bowl', 'Soft Scrambled Eggs', 'Apple Cinnamon Porridge', 'Cottage Cheese Toast', 'Blueberry Kefir Bowl', 'Tuna and Tomato Toast', 'Peanut-free Seed Porridge', 'Turkey Toast', 'Strawberry Oat Bowl', 'Egg and Potato Tortilla Bite', 'Pear Yogurt Bowl', 'Hummus Toast', 'Rice Porridge with Banana', 'Cheese and Grape Toast', 'Protein Fruit Bowl', 'Vegetable Omelette'],
  lunch: ['Salmon Rice Bowl', 'Hake with Potatoes', 'Prawn Quinoa Bowl', 'Bonito Rice Plate', 'Cod Rice Plate', 'Salmon with Sweet Potato', 'Gluten-free Tuna Pasta', 'Chicken Rice Bowl', 'Turkey Potato Plate', 'Lentil Rice Bowl', 'Hake Quinoa Plate', 'Chicken Couscous Bowl', 'Tuna Sweet Potato Plate', 'Egg and Rice Bowl', 'Cod Potato Salad', 'Salmon Pasta Bowl', 'Chicken Quinoa Plate', 'Prawn Rice Noodles', 'Turkey Rice Bowl', 'White Fish with Pumpkin', 'Bonito Potato Bowl', 'Chickpea Rice Plate', 'Hake with Couscous', 'Chicken Pasta Bowl', 'Salmon Lentil Plate', 'Cod Rice Noodles', 'Turkey Sweet Potato Bowl', 'Egg Potato Salad'],
  snack: ['Kiwi and Walnuts', 'Strawberries', 'Walnuts and Blueberries', 'Cured Cheese and Grapes', 'Almonds and Orange', 'Kiwi', 'Banana Rice Cakes', 'Blueberries and Yogurt', 'Apple and Seed Butter', 'Grapes and Cheese', 'Orange and Walnuts', 'Pear and Kefir', 'Rice Cakes with Turkey', 'Strawberries and Seeds', 'Banana and Yogurt', 'Kiwi and Pumpkin Seeds', 'Blueberries and Almonds', 'Apple and Cured Cheese', 'Orange Rice Cakes', 'Pear and Walnuts', 'Grapes and Yogurt', 'Banana and Seeds', 'Kiwi and Cheese', 'Strawberries and Kefir', 'Blueberry Rice Cakes', 'Apple and Yogurt', 'Orange and Pumpkin Seeds', 'Pear and Cheese'],
  dinner: ['Spanish Potato Omelette', 'Vegetable Cream with Egg', 'Cod with Green Beans', 'Spinach Omelette', 'Pumpkin Vegetable Cream', 'Zucchini Omelette', 'Hake with Potatoes', 'Chicken Vegetable Soup', 'Rice Omelette with Spinach', 'Turkey and Pumpkin Plate', 'Cod Potato Omelette', 'Vegetable Cream with Hake', 'Salmon with Green Beans', 'Egg and Sweet Potato Plate', 'Chicken Rice Soup', 'Zucchini Cream with Egg', 'Hake Pumpkin Plate', 'Spinach Tortilla with Salad', 'Turkey Potato Omelette', 'Cod Vegetable Soup', 'Rice Bowl with Egg', 'Chicken Green Beans', 'Pumpkin Cream with Cod', 'Spanish Omelette with Spinach', 'Hake Rice Plate', 'Vegetable Soup with Turkey', 'Salmon Potato Plate', 'Egg and Zucchini Plate']
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
        const title = baseMeals[type][index];
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

  if (/lactose|dairy/.test(context) && /yogurt|cheese|milk/.test(title)) notes.push('Use lactose-free dairy or swap to eggs/soy yogurt.');
  if (/gluten|celiac/.test(context) && /toast|bread|pasta|sourdough/.test(title)) notes.push('Use gluten-free bread or pasta.');
  if (/nut|walnut|almond/.test(context) && /walnut|almond|nuts/.test(title)) notes.push('Replace nuts with seeds or fruit.');
  if (/fish|seafood/.test(context) && /salmon|hake|cod|prawn|bonito|tuna/.test(title)) notes.push('Replace fish with egg, chicken or legumes.');
  if (/egg/.test(context) && /egg|omelette/.test(title)) notes.push('Use tofu scramble or a fish/chicken portion instead.');
  if (/gut|reflux|gallbladder|bloat/.test(context)) notes.push('Keep fat moderate, seasoning gentle and portions slightly smaller.');
  if (/performance|basketball|padel|gym|active|training|run/.test(context)) notes.push(/rice|potato|pasta|toast|oat/.test(title) ? 'Keep the carb base and scale portion around training.' : 'Add an easy carb side if this is near training.');
  if (/weight|lean|lose/.test(context)) notes.push('Prioritize protein and vegetables; keep the carb portion moderate.');
  if (/hair/.test(context)) notes.push('Keep protein plus fruit, nuts or omega-rich add-ons when tolerated.');

  return notes.slice(0, 3).join(' ') || 'Family default: adjust portion to appetite, goal and activity.';
}

function describeMeal(title, type) {
  if (/salmon|hake|cod|prawn|bonito/i.test(title)) return 'Shared Mediterranean fish base with adjustable carbohydrates and vegetables.';
  if (/yogurt/i.test(title)) return 'Simple high-protein breakfast with fruit and tolerance-friendly add-ons.';
  if (/egg|omelette/i.test(title)) return 'Flexible egg-based meal that can be adapted by portion and side dish.';
  if (type === 'snack') return 'Portable family snack with easy individual swaps.';
  return 'Shared family meal with per-member portions and add-ons.';
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
