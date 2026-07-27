async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}

export const api = {
  getFamily: () => request('/family'),
  saveFamily: (family) => request('/family', { method: 'PUT', body: JSON.stringify(family) }),
  getCurrentPlan: () => request('/plans/current'),
  generatePlan: (payload) => request('/plans/generate', { method: 'POST', body: JSON.stringify(payload) }),
  adaptMeal: (planId, mealId, payload) => request(`/plans/${planId}/meals/${mealId}/adapt`, { method: 'POST', body: JSON.stringify(payload) }),
  adaptDay: (planId, dayNumber, payload) => request(`/plans/${planId}/days/${dayNumber}/regenerate`, { method: 'POST', body: JSON.stringify(payload) }),
  swapMeal: (planId, mealId, targetMealId) => request(`/plans/${planId}/meals/${mealId}/swap`, { method: 'POST', body: JSON.stringify({ targetMealId }) }),
  getActivities: () => request('/activities'),
  addActivity: (payload) => request('/activities', { method: 'POST', body: JSON.stringify(payload) }),
  updateActivity: (activityId, payload) => request(`/activities/${activityId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteActivity: (activityId) => request(`/activities/${activityId}`, { method: 'DELETE' }),
  getSymptoms: () => request('/symptoms'),
  logSymptom: (payload) => request('/symptoms', { method: 'POST', body: JSON.stringify(payload) })
};
