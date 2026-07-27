import { createServer } from 'node:http';
import { adaptDayWithAi, adaptMealWithAi, generatePlanWithAi } from './ai.js';
import { sanitizePlanForFamily, swapMeals } from './schema.js';
import { readStore, updateStore } from './storage.js';

const port = Number(process.env.PORT || 8787);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'OPTIONS') return send(res, 204);
    if (!url.pathname.startsWith('/api')) return send(res, 404, { error: 'Not found.' });

    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
    const route = url.pathname.replace(/^\/api/, '') || '/';

    if (req.method === 'GET' && route === '/health') {
      return send(res, 200, { ok: true, openAiConfigured: !!process.env.OPENAI_API_KEY });
    }

    if (req.method === 'GET' && route === '/family') {
      const store = await readStore();
      return send(res, 200, store.family);
    }

    if (req.method === 'PUT' && route === '/family') {
      const family = normalizeFamily(body);
      const store = await updateStore(current => ({
        ...current,
        family,
        plans: current.plans.map(plan => plan.status === 'active' ? sanitizePlanForFamily(plan, family) : plan)
      }));
      return send(res, 200, store.family);
    }

    if (req.method === 'GET' && route === '/plans/current') {
      const store = await readStore();
      const plan = store.plans.find(item => item.status === 'active') || null;
      return send(res, 200, { plan: plan ? sanitizePlanForFamily(plan, store.family) : null });
    }

    if (req.method === 'POST' && route === '/plans/generate') {
      const current = await readStore();
      const family = normalizeFamily(body.family || current.family);
      const { plan, aiUsed } = await generatePlanWithAi({ ...body, family });
      const safePlan = sanitizePlanForFamily(plan, family);
      const store = await updateStore(current => ({
        ...current,
        family,
        plans: [safePlan, ...current.plans.map(item => ({ ...item, status: 'archived' }))],
        aiRequests: [{ id: `ai-${Date.now()}`, type: 'generate-plan', aiUsed, createdAt: new Date().toISOString(), note: body.note || '' }, ...current.aiRequests]
      }));
      return send(res, 200, { plan: store.plans[0], aiUsed });
    }

    const adaptMatch = route.match(/^\/plans\/([^/]+)\/meals\/([^/]+)\/adapt$/);
    if (req.method === 'POST' && adaptMatch) {
      const [, planId, mealId] = adaptMatch;
      const store = await readStore();
      const plan = store.plans.find(item => item.id === planId);
      if (!plan) return send(res, 404, { error: 'Plan not found.' });
      const result = await adaptMealWithAi(plan, mealId, { ...body, activities: store.activities || [] });
      const safePlan = sanitizePlanForFamily(result.plan, body.family || store.family);
      const next = await updateStore(current => ({
        ...current,
        plans: current.plans.map(item => item.id === planId ? safePlan : item),
        aiRequests: [{ id: `ai-${Date.now()}`, type: 'adapt-meal', aiUsed: result.aiUsed, mealId, createdAt: new Date().toISOString(), note: body.note || '' }, ...current.aiRequests]
      }));
      return send(res, 200, { plan: next.plans.find(item => item.id === planId), aiUsed: result.aiUsed });
    }

    const swapMatch = route.match(/^\/plans\/([^/]+)\/meals\/([^/]+)\/swap$/);
    if (req.method === 'POST' && swapMatch) {
      const [, planId, mealId] = swapMatch;
      const store = await readStore();
      const plan = store.plans.find(item => item.id === planId);
      if (!plan) return send(res, 404, { error: 'Plan not found.' });
      const nextPlan = sanitizePlanForFamily(swapMeals(plan, mealId, body.targetMealId), store.family);
      const next = await updateStore(current => ({
        ...current,
        plans: current.plans.map(item => item.id === planId ? nextPlan : item)
      }));
      return send(res, 200, { plan: next.plans.find(item => item.id === planId) });
    }

    const dayMatch = route.match(/^\/plans\/([^/]+)\/days\/([^/]+)\/regenerate$/);
    if (req.method === 'POST' && dayMatch) {
      const [, planId, dayNumber] = dayMatch;
      const store = await readStore();
      const plan = store.plans.find(item => item.id === planId);
      if (!plan) return send(res, 404, { error: 'Plan not found.' });
      const result = await adaptDayWithAi(plan, dayNumber, { ...body, activities: store.activities || [] });
      const safePlan = sanitizePlanForFamily(result.plan, body.family || store.family);
      const next = await updateStore(current => ({
        ...current,
        plans: current.plans.map(item => item.id === planId ? safePlan : item),
        aiRequests: [{ id: `ai-${Date.now()}`, type: 'adapt-day', aiUsed: result.aiUsed, dayNumber: Number(dayNumber), createdAt: new Date().toISOString(), note: body.note || '' }, ...current.aiRequests]
      }));
      return send(res, 200, { plan: next.plans.find(item => item.id === planId), aiUsed: result.aiUsed });
    }

    if (req.method === 'GET' && route === '/activities') {
      const store = await readStore();
      return send(res, 200, { activities: store.activities || [] });
    }

    if (req.method === 'POST' && route === '/activities') {
      const activity = normalizeActivity(body);
      const store = await updateStore(current => ({ ...current, activities: [activity, ...current.activities] }));
      return send(res, 200, { activity, activities: store.activities });
    }

    const activityMatch = route.match(/^\/activities\/([^/]+)$/);
    if (activityMatch && req.method === 'PUT') {
      const [, activityId] = activityMatch;
      const activity = normalizeActivity({ ...body, id: activityId });
      const store = await updateStore(current => ({
        ...current,
        activities: current.activities.map(item => item.id === activityId ? activity : item)
      }));
      return send(res, 200, { activity, activities: store.activities });
    }

    if (activityMatch && req.method === 'DELETE') {
      const [, activityId] = activityMatch;
      const store = await updateStore(current => ({
        ...current,
        activities: current.activities.filter(item => item.id !== activityId)
      }));
      return send(res, 200, { activities: store.activities });
    }

    if (req.method === 'GET' && route === '/symptoms') {
      const store = await readStore();
      return send(res, 200, { symptoms: store.symptoms || [] });
    }

    if (req.method === 'POST' && route === '/symptoms') {
      const symptom = normalizeSymptom(body);
      const store = await updateStore(current => ({ ...current, symptoms: [symptom, ...(current.symptoms || [])] }));
      return send(res, 200, { symptom, symptoms: store.symptoms });
    }

    if (req.method === 'GET' && route === '/ratings') {
      const store = await readStore();
      return send(res, 200, { mealRatings: store.mealRatings || [] });
    }

    if (req.method === 'POST' && route === '/ratings') {
      const rating = normalizeMealRating(body);
      const store = await updateStore(current => ({
        ...current,
        mealRatings: [rating, ...(current.mealRatings || []).filter(item => !(item.profileId === rating.profileId && item.mealId === rating.mealId))]
      }));
      return send(res, 200, { rating, mealRatings: store.mealRatings });
    }

    return send(res, 404, { error: 'Not found.' });
  } catch (error) {
    return send(res, 500, { error: error.message || 'Server error.' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`v11 API listening on http://127.0.0.1:${port}`);
});

function normalizeFamily(value = {}) {
  return {
    id: value.id || 'family-local',
    name: value.name || 'Family',
    profiles: Array.isArray(value.profiles) ? value.profiles.map(normalizeProfile) : []
  };
}

function normalizeProfile(profile, index) {
  return {
    id: profile.id || `profile-${index + 1}`,
    name: profile.name || `Profile ${index + 1}`,
    role: profile.role || 'adult',
    age: profile.age || '',
    heightCm: profile.heightCm || '',
    weightKg: profile.weightKg || '',
    goal: profile.goal || '',
    restrictions: profile.restrictions || '',
    activities: profile.activities || '',
    preferences: profile.preferences || ''
  };
}

function normalizeActivity(activity) {
  return {
    id: activity.id || `activity-${Date.now()}`,
    dayNumber: Number(activity.dayNumber || 1),
    profileId: activity.profileId || '',
    profileName: activity.profileName || '',
    type: activity.type || 'Activity',
    time: activity.time || '09:00',
    createdAt: activity.createdAt || new Date().toISOString()
  };
}

function normalizeSymptom(symptom) {
  return {
    id: symptom.id || `symptom-${Date.now()}`,
    profileId: symptom.profileId || '',
    mealId: symptom.mealId || '',
    mealTitle: symptom.mealTitle || '',
    mealType: symptom.mealType || '',
    dayNumber: Number(symptom.dayNumber || 0),
    delay: symptom.delay || '',
    symptom: symptom.symptom || 'Other',
    notes: symptom.notes || '',
    tags: Array.isArray(symptom.tags) ? symptom.tags : [],
    createdAt: symptom.createdAt || new Date().toISOString()
  };
}

function normalizeMealRating(rating) {
  return {
    id: rating.id || `rating-${Date.now()}`,
    profileId: rating.profileId || '',
    mealId: rating.mealId || '',
    mealTitle: rating.mealTitle || '',
    dayNumber: Number(rating.dayNumber || 0),
    value: ['loved', 'ok', 'no'].includes(rating.value) ? rating.value : 'ok',
    createdAt: rating.createdAt || new Date().toISOString()
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function send(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(payload ? JSON.stringify(payload) : '');
}
