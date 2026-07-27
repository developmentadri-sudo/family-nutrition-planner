import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './services/api.js';
import './styles.css';

const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };
const planStart = new Date(2026, 6, 6);
const personaStorageKey = 'family-nutrition-planner-persona';

function Icon({ name }) {
  const paths = {
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    swap: <><path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" /></>,
    ai: <><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" /><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" /></>,
    user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    edit: <><path d="M12 20h9" /><path d="m16.5 3.5 4 4L8 20l-4 1 1-4Z" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m6 6 1 15h10l1-15" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
    circle: <circle cx="12" cy="12" r="7" />,
    check: <path d="M20 6 9 17l-5-5" />,
    symptom: <path d="M22 12h-4l-3 7-6-14-3 7H2" />
  };
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function App() {
  const [activeTab, setActiveTab] = useState('Profiles');
  const [family, setFamily] = useState(null);
  const [plan, setPlan] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [status, setStatus] = useState('Loading v12.3 workspace...');
  const [toast, setToast] = useState('');
  const [selectedPersona, setSelectedPersona] = useState(() => localStorage.getItem(personaStorageKey) || '');
  const [personaOpen, setPersonaOpen] = useState(false);

  function notify(message) {
    setToast(message);
  }

  async function refresh() {
    const [familyData, planData, activityData] = await Promise.all([api.getFamily(), api.getCurrentPlan(), api.getActivities()]);
    setFamily(familyData);
    setPlan(planData.plan);
    setActivities(activityData.activities || []);
    setActiveTab(planData.plan ? 'Today' : 'Profiles');
    setStatus(planData.plan ? 'Routine loaded.' : 'Create profiles, then generate the first routine.');
  }

  useEffect(() => { refresh().catch(err => { setStatus(err.message); notify(err.message); }); }, []);

  useEffect(() => {
    if (!family) return;
    const validIds = new Set(['family', ...(family.profiles || []).map(profile => profile.id)]);
    if (!selectedPersona || !validIds.has(selectedPersona)) setPersonaOpen(true);
  }, [family, selectedPersona]);

  function choosePersona(personaId) {
    localStorage.setItem(personaStorageKey, personaId);
    setSelectedPersona(personaId);
    setPersonaOpen(false);
    notify(`Viewing as ${personaLabel(personaId, family)}.`);
  }

  async function saveFamily(nextFamily) {
    setFamily(nextFamily);
    await api.saveFamily(nextFamily);
  }

  async function generatePlan(note = '') {
    setStatus('Generating 28-day routine...');
    await api.saveFamily(family);
    const result = await api.generatePlan({ family, note });
    setPlan(result.plan);
    setSelectedDay(result.plan.days[0]?.dayNumber || 1);
    setActiveTab('Today');
    notify(result.aiUsed ? 'AI routine generated.' : 'Local 28-day starter routine generated.');
  }

  async function adaptMeal(meal, note) {
    try {
      const result = await api.adaptMeal(plan.id, meal.id, { family, plan, activities, note });
      setPlan(result.plan);
      notify(result.aiUsed ? 'Meal adapted with AI.' : 'Meal adapted locally.');
    } catch (error) {
      notify(error.message);
    }
  }

  async function adaptDay(dayNumber) {
    try {
      const result = await api.adaptDay(plan.id, dayNumber, { family, plan, activities });
      setPlan(result.plan);
      notify(result.aiUsed ? 'Day adapted with AI.' : 'Day adapted locally.');
    } catch (error) {
      notify(error.message);
    }
  }

  async function swapMeal(meal, targetMealId) {
    const result = await api.swapMeal(plan.id, meal.id, targetMealId);
    setPlan(result.plan);
    notify('Meals swapped across the week.');
  }

  async function logSymptom(payload) {
    await api.logSymptom(payload);
    notify('Symptom logged.');
  }

  async function addActivity(payload) {
    const result = await api.addActivity(payload);
    setActivities(result.activities || []);
    notify('Activity added.');
  }

  async function updateActivity(activityId, payload) {
    try {
      const result = await api.updateActivity(activityId, payload);
      setActivities(result.activities || []);
      notify('Activity updated.');
    } catch (error) {
      notify(error.message);
    }
  }

  async function deleteActivity(activityId) {
    try {
      if (!activityId) throw new Error('Activity id missing.');
      const result = await api.deleteActivity(activityId);
      setActivities(result.activities || []);
      notify('Activity removed.');
    } catch (error) {
      notify(error.message);
    }
  }

  if (!family) return <main className="shell"><section className="card">{status}</section></main>;
  const persona = activePersona(selectedPersona, family);

  return (
    <>
      <header>
        <div className="wrap top">
          <div>
            <h1>Family Nutrition Planner</h1>
          </div>
          <div className="headerNav">
            <div className="viewToggle" aria-label="View mode">
              <button className={activeTab === 'Today' ? 'active' : ''} onClick={() => setActiveTab('Today')}>Day</button>
              <button className={activeTab === 'Week' ? 'active' : ''} onClick={() => setActiveTab('Week')}>Week</button>
              <button className={activeTab === 'Profiles' ? 'active' : ''} onClick={() => setActiveTab('Profiles')}>Profiles</button>
            </div>
            <button className="personaButton" onClick={() => setPersonaOpen(true)}>
              <span className="avatar mini"><span className="avatarLetter">{personaInitials(selectedPersona, family)}</span></span>
              <span>{personaLabel(selectedPersona, family)}</span>
            </button>
          </div>
        </div>
      </header>
      <main className="shell">
        {activeTab === 'Profiles' && <Profiles family={family} plan={plan} persona={persona} onChange={saveFamily} onGenerate={generatePlan} />}
        {activeTab === 'Week' && <Week plan={plan} persona={persona} activities={activities} selectedDay={selectedDay} onSelectDay={setSelectedDay} />}
        {activeTab === 'Today' && <Today family={family} persona={persona} plan={plan} activities={activities} selectedDay={selectedDay} onSelectDay={setSelectedDay} onAdaptMeal={adaptMeal} onAdaptDay={adaptDay} onSwapMeal={swapMeal} onLogSymptom={logSymptom} onAddActivity={addActivity} onUpdateActivity={updateActivity} onDeleteActivity={deleteActivity} />}
      </main>
      <Toast message={toast} onDone={() => setToast('')} />
      {personaOpen && <PersonaSelector family={family} selectedPersona={selectedPersona} onChoose={choosePersona} />}
    </>
  );
}

function PersonaSelector({ family, selectedPersona, onChoose }) {
  const choices = [{ id: 'family', name: 'Family', description: 'Shared plan, everyone together.' }, ...(family.profiles || []).map(profile => ({
    id: profile.id,
    name: profile.name,
    description: personaDescription(profile)
  }))];

  return (
    <div className="personaScreen">
      <section className="personaPanel">
        <div>
          <p className="kicker">Welcome</p>
          <h2>Who is using the planner?</h2>
          <p>Choose a lens for the app. The meal plan stays shared; the language and priorities will become personal in the next steps.</p>
        </div>
        <div className="personaGrid">
          {choices.map(choice => (
            <button className={selectedPersona === choice.id ? 'personaChoice active' : 'personaChoice'} key={choice.id} onClick={() => onChoose(choice.id)}>
              <span className="avatar"><span className="avatarLetter">{choice.id === 'family' ? 'FA' : choice.name?.slice(0, 2).toUpperCase() || 'P'}</span></span>
              <span><b>{choice.name}</b><small>{choice.description}</small></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [message, onDone]);
  if (!message) return null;
  return <div className="toast" role="status" aria-live="polite">{message}</div>;
}

function Profiles({ family, plan, persona, onChange, onGenerate }) {
  const [note, setNote] = useState('');
  const profiles = family.profiles || [];
  const updateProfile = (id, patch) => onChange({ ...family, profiles: profiles.map(p => p.id === id ? { ...p, ...patch } : p) });
  const addProfile = () => onChange({ ...family, profiles: [...profiles, { id: crypto.randomUUID(), name: 'New profile', role: 'adult', age: '', heightCm: '', weightKg: '', goal: 'Eat healthier', restrictions: '', activities: '', preferences: '' }] });

  return (
    <section className="grid">
      <div className="card span12 toolbar">
        <div><h2>People Profiles</h2><p>Profiles shape the shared routine, portions, restrictions and activity timing.</p></div>
        <button onClick={addProfile}>Add profile</button>
      </div>
      <div className="card span12 report">
        <span className="pill green">{profiles.length} profile{profiles.length === 1 ? '' : 's'}</span>
        <span className="pill blue">{plan ? `${plan.days.length} days planned` : 'No plan yet'}</span>
        <span className="muted">{plan?.summary || 'Generate a plan after adding at least one profile.'}</span>
      </div>
      {profiles.map(profile => <ProfileCard key={profile.id} profile={profile} active={persona.type === 'person' && persona.profile.id === profile.id} onChange={patch => updateProfile(profile.id, patch)} />)}
      <div className="card span12 aiPanel">
        <h2>Generate Plan</h2>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="This week is very active, avoid salmon, Ruth has padel at 19:00..." />
        <button className="primary" disabled={!profiles.length} onClick={() => onGenerate(note)}>Generate 28-day plan</button>
      </div>
    </section>
  );
}

function ProfileCard({ profile, active, onChange }) {
  const [editing, setEditing] = useState(false);
  const initials = profile.name?.slice(0, 2).toUpperCase() || 'P';

  if (!editing) {
    return (
      <div className={active ? 'card profileSummary activeProfile' : 'card profileSummary'}>
        <div className="avatar"><span className="avatarLetter">{initials}</span></div>
        <div>
          <h3>{profile.name || 'Profile'}</h3>
          <p>{profile.goal || 'No goal set yet'}</p>
          {profile.restrictions && <small>{profile.restrictions}</small>}
        </div>
        <button onClick={() => setEditing(true)}>Edit</button>
      </div>
    );
  }

  return (
    <div className="card profile">
      <div className="profileEditHeader"><div className="avatar"><span className="avatarLetter">{initials}</span></div><button onClick={() => setEditing(false)}>Done</button></div>
      <label>Name<input value={profile.name || ''} onChange={e => onChange({ name: e.target.value })} /></label>
      <label>Goal<input value={profile.goal || ''} onChange={e => onChange({ goal: e.target.value })} /></label>
      <label>Age<input value={profile.age || ''} onChange={e => onChange({ age: e.target.value })} /></label>
      <label>Height cm<input value={profile.heightCm || ''} onChange={e => onChange({ heightCm: e.target.value })} /></label>
      <label>Weight kg<input value={profile.weightKg || ''} onChange={e => onChange({ weightKg: e.target.value })} /></label>
      <label>Restrictions<textarea value={profile.restrictions || ''} onChange={e => onChange({ restrictions: e.target.value })} /></label>
      <label>Activities<textarea value={profile.activities || ''} onChange={e => onChange({ activities: e.target.value })} /></label>
      <label>Preferences<textarea value={profile.preferences || ''} onChange={e => onChange({ preferences: e.target.value })} /></label>
    </div>
  );
}

function Week({ plan, persona, activities, selectedDay, onSelectDay }) {
  if (!plan) return <Empty title="No week plan yet" />;
  const week = weekDays(plan, weekOf(selectedDay));
  return (
    <section className="today">
      <WeekSelector week={week} selectedDay={selectedDay} onSelectDay={onSelectDay} onShift={delta => onSelectDay(Math.max(1, Math.min(28, selectedDay + delta * 7)))} />
      <PersonaContext persona={persona} day={plan.days.find(d => d.dayNumber === selectedDay)} activities={activities} />
      <div className="weekGrid">
        {week.map(day => <button className={day.dayNumber === selectedDay ? 'weekCard active' : 'weekCard'} key={day.id} onClick={() => onSelectDay(day.dayNumber)}><b>{day.label}</b>{day.meals.map(meal => <span key={meal.id}>{mealLabels[meal.type]}: {meal.title}</span>)}<small>{dayLensSummary(day, activities, persona)}</small></button>)}
      </div>
    </section>
  );
}

function Today({ family, persona, plan, activities, selectedDay, onSelectDay, onAdaptMeal, onAdaptDay, onSwapMeal, onLogSymptom, onAddActivity, onUpdateActivity, onDeleteActivity }) {
  const [open, setOpen] = useState({});
  const [memberOpen, setMemberOpen] = useState({});
  const [notes, setNotes] = useState({});
  const [swapMeal, setSwapMeal] = useState(null);
  const [symptomMeal, setSymptomMeal] = useState(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const weekNumber = weekOf(selectedDay);
  const week = weekDays(plan, weekNumber);
  const day = useMemo(() => plan?.days.find(d => d.dayNumber === selectedDay), [plan, selectedDay]);
  const visibleActivities = useMemo(() => activitiesForPersona(activities, persona), [activities, persona]);
  const items = useMemo(() => agendaItems(day, visibleActivities, persona), [day, visibleActivities, persona]);
  if (!plan || !day) return <Empty title="No routine generated yet" />;
  async function handleMealAdapt(meal) {
    await onAdaptMeal(meal, notes[meal.id] || '');
    setOpen(current => ({ ...current, [meal.id]: false }));
  }
  return (
    <section className="today">
      <WeekSelector week={week} selectedDay={selectedDay} onSelectDay={onSelectDay} onShift={delta => onSelectDay(Math.max(1, Math.min(28, selectedDay + delta * 7)))} onAdd={() => setEventOpen(true)} onAdapt={() => onAdaptDay(selectedDay)} />
      <PersonaContext persona={persona} day={day} activities={activities} />
      <div className="agenda">{items.map(item => item.kind === 'activity'
        ? <ActivityCard key={item.id} activity={item} onEdit={setEditingEvent} onDelete={onDeleteActivity} />
        : <MealCard key={item.id} meal={item} family={family} persona={persona} open={!!open[item.id]} membersOpen={!!memberOpen[item.id]} note={notes[item.id] || ''} onToggle={() => setOpen({ ...open, [item.id]: !open[item.id] })} onNote={value => setNotes({ ...notes, [item.id]: value })} onAdapt={() => handleMealAdapt(item)} onSwap={() => setSwapMeal(item)} onMembers={() => setMemberOpen(current => ({ ...current, [item.id]: !current[item.id] }))} onSymptom={() => setSymptomMeal(item)} />)}</div>
      {swapMeal && <SwapDrawer meal={swapMeal} plan={plan} onClose={() => setSwapMeal(null)} onChoose={targetId => { onSwapMeal(swapMeal, targetId); setSwapMeal(null); }} />}
      {symptomMeal && <SymptomDialog meal={symptomMeal} family={family} persona={persona} onClose={() => setSymptomMeal(null)} onSave={payload => { onLogSymptom(payload); setSymptomMeal(null); }} />}
      {eventOpen && <EventDialog dayNumber={selectedDay} family={family} onClose={() => setEventOpen(false)} onSave={payload => { onAddActivity(payload); setEventOpen(false); }} />}
      {editingEvent && <EventDialog dayNumber={selectedDay} family={family} activity={editingEvent} onClose={() => setEditingEvent(null)} onSave={payload => { onUpdateActivity(editingEvent.id, payload); setEditingEvent(null); }} />}
    </section>
  );
}

function WeekSelector({ week, selectedDay, onSelectDay, onShift, onAdd, onAdapt }) {
  const stripRef = useRef(null);
  useEffect(() => {
    const selected = stripRef.current?.querySelector('.active');
    selected?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  }, [selectedDay]);

  return (
    <div className="weekSelector">
      <div className="stripNav">
        <button className="ghostIcon" onClick={() => onShift(-1)}><Icon name="chevronLeft" /></button>
        <div className="dayStrip" ref={stripRef}>{week.map(day => {
          const [dow, date] = day.label.split(' ');
          const today = isToday(day);
          return <button className={day.dayNumber === selectedDay ? 'active' : ''} key={day.id} onClick={() => onSelectDay(day.dayNumber)}><b>{dow}</b><span>{date}</span>{today && <i aria-hidden="true" />}</button>;
        })}</div>
        <button className="ghostIcon" onClick={() => onShift(1)}><Icon name="chevronRight" /></button>
        <div className="stripActions">
          <span className="weekLabel">{weekRange(week)}</span>
          {onAdd && <button className="compactAction" onClick={onAdd}><Icon name="plus" /> Add</button>}
          {onAdapt && <button className="compactAction brand" onClick={onAdapt}><Icon name="ai" /> Adapt</button>}
        </div>
      </div>
    </div>
  );
}

function PersonaContext({ persona, day, activities }) {
  const activityCount = activitiesForPersona(activities.filter(activity => Number(activity.dayNumber) === Number(day?.dayNumber)), persona).length;
  const title = persona.type === 'family' ? 'Family view' : `${persona.profile.name}'s day`;
  const text = persona.type === 'family'
    ? 'Shared plan first, with individual timing and adjustments available inside each meal.'
    : personaDayMessage(persona.profile, day, activityCount);

  return (
    <section className={persona.type === 'family' ? 'lensBar familyLens' : 'lensBar'}>
      <span className="avatar mini"><span className="avatarLetter">{persona.type === 'family' ? 'FA' : persona.profile.name?.slice(0, 2).toUpperCase()}</span></span>
      <div><b>{title}</b><span>{text}</span></div>
    </section>
  );
}

function MealCard({ meal, family, persona, open, membersOpen, note, onToggle, onNote, onAdapt, onSwap, onMembers, onSymptom }) {
  const split = Array.isArray(meal.memberTimings) && meal.memberTimings.length > 0;
  const visibleTimings = timingsForPersona(meal.memberTimings || [], persona);
  const familyTime = meal.familyTime || meal.time;
  const shiftedForPersona = persona.type === 'person' && meal.time !== familyTime;
  const [adaptOpen, setAdaptOpen] = useState(open);
  const [adapting, setAdapting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setAdaptOpen(open);
  }, [open]);

  useEffect(() => {
    function closeMenu(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [menuOpen]);

  async function handleAdapt() {
    setAdapting(true);
    try {
      await onAdapt();
    } finally {
      setAdapting(false);
      setAdaptOpen(false);
    }
  }

  function choose(action) {
    setMenuOpen(false);
    action();
  }

  return (
    <div className="agendaRow">
      <div className="time">{meal.time}</div>
      <article className={adapting ? 'meal adapting' : 'meal'}>
        <div className="mealMenu" ref={menuRef}>
          <button className="iconButton" title="Meal actions" onClick={() => setMenuOpen(!menuOpen)}><Icon name="more" /></button>
          {menuOpen && <div className="actionMenu">
            <button onClick={() => choose(onSwap)}><Icon name="swap" /> Swap meal</button>
            <button onClick={() => choose(() => { setAdaptOpen(true); onToggle(); })}><Icon name="ai" /> Suggest variation</button>
            <button onClick={() => choose(onMembers)}><Icon name="user" /> {persona.type === 'family' ? 'User specifics' : 'My specifics'}</button>
            <button onClick={() => choose(onSymptom)}><Icon name="symptom" /> Log symptoms</button>
          </div>}
        </div>
        <div className="mealHeader"><p className="kicker">{mealLabels[meal.type]}</p>{meal.reason && <span className="editedPill">Edited</span>}</div>
        {shiftedForPersona && <p className="familyTimeNote">Family default {familyTime}</p>}
        <h2>{meal.title} <MealEmoji meal={meal} /></h2>
        <p>{meal.description}</p>
        <div className="tagRow">{(meal.tags || inferTags(meal.title)).map(tag => <span className={`pill ${tag.tone}`} key={tag.label}>{tag.label}</span>)}</div>
        {split && visibleTimings.length > 0 && <div className="timingChips">{visibleTimings.map(item => <TimingChip item={item} key={item.profileId || item.name} />)}</div>}
        {membersOpen && <UserSpecificsInline meal={meal} family={family} persona={persona} />}
        {adaptOpen && <div className="adaptBox"><textarea value={note} onChange={e => onNote(e.target.value)} placeholder="Missing ingredient, schedule change, active day..." disabled={adapting} /><button className="primary" onClick={handleAdapt} disabled={adapting}>{adapting ? 'Adapting...' : 'Adapt this meal'}</button></div>}
      </article>
    </div>
  );
}

function TimingChip({ item }) {
  return <div className="timingChip"><span className="chipAvatar"><span className="avatarLetter">{item.name?.slice(0, 1).toUpperCase() || 'P'}</span></span><div><b>{item.name} · <em>{item.time}</em></b><span>{item.note}</span></div></div>;
}

function ActivityCard({ activity, onEdit, onDelete }) {
  return (
    <div className="agendaRow activityRow">
      <div className="time">{activity.time}</div>
      <article className="activityCard">
        <p className="kicker">Activity</p>
        <h2>{activity.type}</h2>
        <div className="timingChips activityChips">{activity.people.map(person => <EventTimingChip activity={activity} person={person} key={person.id || `${person.profileId}-${activity.time}-${activity.type}`} onEdit={onEdit} onDelete={onDelete} />)}</div>
      </article>
    </div>
  );
}

function EventTimingChip({ activity, person, onEdit, onDelete }) {
  return <div className="timingChip eventChip"><span className="chipAvatar"><span className="avatarLetter">{person.profileName?.slice(0, 1).toUpperCase() || 'P'}</span></span><div><b>{person.profileName || 'Family'} · <em>{activity.time}</em></b><span>Manual event</span></div><div className="eventActions"><button title="Edit event" onClick={event => { event.stopPropagation(); onEdit(person); }}><Icon name="edit" /></button><button title="Remove event" onClick={event => { event.stopPropagation(); onDelete(person.id); }}><Icon name="trash" /></button></div></div>;
}

function UserSpecificsInline({ meal, family, persona }) {
  const notes = memberNotesForMeal(meal, profilesForPersona(family.profiles || [], persona));
  return (
    <div className="inlineSpecifics">
      {notes.map(item => (
        <section className="specificChip" key={item.profileId}>
          <span className="chipAvatar"><span className="avatarLetter">{item.name?.slice(0, 1).toUpperCase() || 'P'}</span></span>
          <div><b>{item.name}</b><span>{item.note}</span></div>
        </section>
      ))}
    </div>
  );
}

function SwapDrawer({ meal, plan, onChoose, onClose }) {
  const choices = plan.days.flatMap(day => day.meals.map(item => ({ ...item, dayLabel: day.label }))).filter(item => item.type === meal.type && item.id !== meal.id);
  return <div className="drawer"><div className="shade" onClick={onClose} /><aside><div className="toolbar"><div><h2>Swap {mealLabels[meal.type]}</h2><p>Choose another day. Both meals trade places.</p></div><button onClick={onClose}>Close</button></div>{choices.map(choice => <button className="swapChoice" key={choice.id} onClick={() => onChoose(choice.id)}><b>{choice.title}</b><span>{choice.dayLabel}</span><small>{choice.description}</small></button>)}</aside></div>;
}

function MemberDrawer({ meal, family, onClose }) {
  const notes = memberNotesForMeal(meal, family.profiles || []);
  return <div className="drawer"><div className="shade" onClick={onClose} /><aside><div className="toolbar"><div><h2>User Specifics</h2><p>{meal.title}</p></div><button onClick={onClose}>Close</button></div><div className="memberList">{notes.map(item => <section className="memberNote" key={item.profileId}><div className="avatar"><span className="avatarLetter">{item.name?.slice(0, 2).toUpperCase() || 'P'}</span></div><div><h3>{item.name}</h3><p>{item.note}</p></div></section>)}</div></aside></div>;
}

function SymptomDialog({ meal, family, persona, onSave, onClose }) {
  const [profileId, setProfileId] = useState(persona.type === 'person' ? persona.profile.id : family.profiles[0]?.id || '');
  const [delay, setDelay] = useState('1 hour');
  const [symptom, setSymptom] = useState('Headache');
  return <div className="drawer"><div className="shade" onClick={onClose} /><aside><div className="toolbar"><div><h2>Log Symptom</h2><p>{meal.title}</p></div><button onClick={onClose}>Close</button></div><label>Profile<select value={profileId} onChange={e => setProfileId(e.target.value)}>{family.profiles.map(profile => <option value={profile.id} key={profile.id}>{profile.name}</option>)}</select></label><label>Time since meal<select value={delay} onChange={e => setDelay(e.target.value)}>{['30 minutes', '1 hour', '2 hours', '4 hours', 'Next morning'].map(item => <option key={item}>{item}</option>)}</select></label><label>Symptom<select value={symptom} onChange={e => setSymptom(e.target.value)}>{['Headache', 'Bloating', 'Cramps', 'Nausea', 'Reflux', 'Fatigue', 'Other'].map(item => <option key={item}>{item}</option>)}</select></label><button className="primary" onClick={() => onSave({ profileId, mealId: meal.id, mealTitle: meal.title, delay, symptom })}>OK</button></aside></div>;
}

function EventDialog({ dayNumber, family, activity, onSave, onClose }) {
  const [profileId, setProfileId] = useState(activity?.profileId || family.profiles[0]?.id || '');
  const [type, setType] = useState(activity?.type || 'Gym');
  const [time, setTime] = useState(activity?.time || '09:00');
  const profile = family.profiles.find(item => item.id === profileId);
  return <div className="drawer"><div className="shade" onClick={onClose} /><aside><div className="toolbar"><div><h2>{activity ? 'Edit Event' : 'Add Event'}</h2><p>Place activity between meals.</p></div><button onClick={onClose}>Close</button></div><label>Profile<select value={profileId} onChange={e => setProfileId(e.target.value)}>{family.profiles.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Activity<input value={type} onChange={e => setType(e.target.value)} placeholder="Gym, basketball, padel..." /></label><label>Time<input type="time" value={time} onChange={e => setTime(e.target.value)} /></label><button className="primary" onClick={() => onSave({ id: activity?.id, dayNumber, profileId, profileName: profile?.name || '', type, time, createdAt: activity?.createdAt })}>OK</button></aside></div>;
}

function memberNotesForMeal(meal, profiles) {
  return profiles.map(profile => {
    const saved = (meal.memberNotes || []).find(item => item.profileId === profile.id || item.name === profile.name);
    const local = localProfileNote(profile, meal);
    return {
      profileId: profile.id,
      name: profile.name,
      note: local.startsWith('Family default') && saved?.note ? saved.note : local
    };
  });
}

function localProfileNote(profile, meal) {
  const context = `${profile.goal || ''} ${profile.restrictions || ''} ${profile.activities || ''} ${profile.preferences || ''}`.toLowerCase();
  const title = (meal.title || '').toLowerCase();
  const notes = [];
  const alternative = profileAlternative(profile, meal);
  if (alternative) notes.push(alternative);
  if (/lactose|dairy/.test(context) && /yogurt|cheese|milk/.test(title)) notes.push(dairySwapForMeal(title));
  if (/gluten|celiac/.test(context) && /toast|bread|pasta|sourdough/.test(title)) notes.push(glutenSwapForMeal(title));
  if (/nut|walnut|almond/.test(context) && /walnut|almond|nuts/.test(title)) notes.push(nutSwapForMeal(title));
  if (/gut|reflux|gallbladder|bloat/.test(context)) notes.push(gutNoteForMeal(title, meal.type));
  if (/basketball|padel|gym|active|training|performance/.test(context)) notes.push(performanceNoteForMeal(title, meal.type));
  if (/weight|lean|lose/.test(context)) notes.push(weightNoteForMeal(title, meal.type));
  if (/hair/.test(context)) notes.push(hairNoteForMeal(title, meal.type));
  return notes.slice(0, 3).join(' ') || 'Family default: adjust portion to appetite, goal and activity.';
}

function dairySwapForMeal(title) {
  if (/yogurt|kefir/.test(title)) return 'Use lactose-free Greek yogurt or soy yogurt; keep the same fruit topping.';
  if (/cheese/.test(title)) return 'Use lactose-free cheese or replace it with egg, hummus or tofu.';
  return 'Use lactose-free dairy or a non-dairy base.';
}

function glutenSwapForMeal(title) {
  if (/toast|sourdough|bread/.test(title)) return 'Use gluten-free toast and keep the same toppings.';
  if (/pasta/.test(title)) return 'Use gluten-free pasta and keep the same sauce/protein.';
  return 'Use the gluten-free version of the carb base.';
}

function nutSwapForMeal(title) {
  if (/walnut|almond/.test(title)) return 'Swap nuts for pumpkin seeds, chia or extra berries.';
  return 'Replace nuts with seeds or fruit.';
}

function gutNoteForMeal(title, type) {
  if (/salmon|hake|cod|tuna|bonito/.test(title)) return 'Keep the fish portion moderate, choose plain rice or potato, and add cucumber, carrots or zucchini instead of heavy sauces.';
  if (/omelette|egg/.test(title)) return 'Keep the omelette lightly cooked with spinach or zucchini; avoid onion-heavy sides.';
  if (/yogurt|kefir/.test(title)) return 'Use lactose-free yogurt, keep berries moderate, and skip extra nuts if digestion feels sensitive.';
  if (type === 'snack') return 'Keep the snack simple: fruit first, with seeds or nuts only if well tolerated.';
  return 'Keep seasoning gentle, fat moderate, and add a cooked vegetable side.';
}

function performanceNoteForMeal(title, type) {
  if (/rice|potato|pasta|toast|oat|porridge/.test(title)) return 'Keep the carb base; add a little extra rice, potato or toast when training is within a few hours.';
  if (/salmon|hake|cod|egg|tofu|lentil|chickpea|bean/.test(title)) return 'Keep the protein, and pair it with rice, potato or bread if this is close to training.';
  if (type === 'snack') return 'Use this as a pre-session bite: banana, rice cakes or fruit work better than a heavy portion.';
  return 'Add an easy carb side if this is near training.';
}

function weightNoteForMeal(title, type) {
  if (/rice|pasta|potato/.test(title)) return 'Keep the same dish, but use a smaller carb portion and add extra vegetables or salad.';
  if (/yogurt/.test(title) || type === 'snack') return 'Keep protein steady and use fruit as the main add-on, with nuts measured.';
  return 'Keep protein central, double the vegetables, and moderate added fats.';
}

function hairNoteForMeal(title, type) {
  if (/salmon|tuna|bonito/.test(title)) return 'Pair the fish with strawberries, kiwi or blueberries for vitamin C; add walnuts only if tolerated.';
  if (/egg|omelette/.test(title)) return 'Add spinach or tomato on the side, plus kiwi or berries later in the day.';
  if (/yogurt|kefir/.test(title)) return 'Use berries or kiwi as the topping, with chia or walnuts if tolerated.';
  if (/walnut|almond|nuts/.test(title)) return 'Keep the nuts portion and pair it with kiwi, strawberries or blueberries.';
  if (type === 'snack') return 'Choose fruit with seeds or walnuts to support micronutrients without making it heavy.';
  return 'Add vitamin-C fruit and a tolerated omega-rich topping or seed side.';
}

function profileAlternative(profile, meal) {
  const context = `${profile.goal || ''} ${profile.restrictions || ''} ${profile.activities || ''} ${profile.preferences || ''}`.toLowerCase();
  const title = meal.title || '';
  const text = title.toLowerCase();
  const diet = /vegan/.test(context) ? 'vegan' : /vegetarian/.test(context) ? 'vegetarian' : /pescetarian/.test(context) ? 'pescetarian' : 'omnivore';
  const hasFish = /salmon|hake|cod|prawn|bonito|tuna|fish|seafood/.test(text);
  const hasMeat = /chicken|turkey|meat|beef|pork|ham/.test(text);
  const hasEggDairy = /egg|omelette|yogurt|cheese|milk|kefir/.test(text);
  const wantsMeat = /meat|chicken|turkey|animal protein/.test(context) && diet === 'omnivore';
  if (diet === 'vegan' && (hasFish || hasMeat || hasEggDairy)) return `Use ${profileAlternativeTitle(title, meal.type, 'vegan')} for this profile, keeping the same base and timing.`;
  if (diet === 'vegetarian' && (hasFish || hasMeat)) return `Use ${profileAlternativeTitle(title, meal.type, 'vegetarian')} for this profile, keeping the same base and timing.`;
  if (diet === 'pescetarian' && hasMeat) return `Use ${profileAlternativeTitle(title, meal.type, 'pescetarian')} for this profile, keeping the same base and timing.`;
  if (wantsMeat && !hasFish && !hasMeat && /lentil|chickpea|bean|tofu|egg|vegetable|rice|quinoa|potato|pasta/.test(text)) return `Optional add-on: chicken or turkey portion for this profile, while the family base stays ${title}.`;
  return '';
}

function profileAlternativeTitle(title, type, diet) {
  const text = title.toLowerCase();
  if (diet === 'vegan') {
    if (/rice/.test(text)) return 'tofu rice bowl';
    if (/quinoa/.test(text)) return 'chickpea quinoa bowl';
    if (/potato/.test(text)) return 'bean potato plate';
    if (/pasta/.test(text)) return 'lentil pasta bowl';
    if (type === 'breakfast') return 'soy yogurt bowl or oat porridge';
    if (type === 'snack') return 'fruit with seeds';
    return 'tofu or legumes';
  }
  if (/rice/.test(text)) return diet === 'pescetarian' ? 'salmon or tuna rice bowl' : 'tofu or egg rice bowl';
  if (/potato/.test(text)) return diet === 'pescetarian' ? 'hake potato plate' : 'egg or bean potato plate';
  if (/quinoa/.test(text)) return 'chickpea quinoa bowl';
  if (/pasta/.test(text)) return 'lentil pasta bowl';
  return diet === 'pescetarian' ? 'fish, eggs or legumes' : 'eggs, tofu or legumes';
}

function activePersona(personaId, family) {
  const profile = (family?.profiles || []).find(item => item.id === personaId);
  if (profile) return { type: 'person', id: profile.id, profile };
  return { type: 'family', id: 'family' };
}

function profilesForPersona(profiles, persona) {
  if (persona.type === 'family') return profiles;
  return profiles.filter(profile => profile.id === persona.profile.id);
}

function activitiesForPersona(activities, persona) {
  if (persona.type === 'family') return activities;
  return activities.filter(activity => activity.profileId === persona.profile.id);
}

function timingsForPersona(timings, persona) {
  if (persona.type === 'family') return timings;
  return timings.filter(item => item.profileId === persona.profile.id || item.name === persona.profile.name);
}

function personaDayMessage(profile, day, activityCount) {
  const context = `${profile.goal || ''} ${profile.restrictions || ''} ${profile.activities || ''} ${profile.preferences || ''}`.toLowerCase();
  const activityText = activityCount ? `${activityCount} activity ${activityCount === 1 ? 'event' : 'events'} today` : 'no activity events logged today';
  if (/gut|reflux|bloat|lactose|sensitive|headache|stomach/.test(context)) return `Comfort lens active: ${activityText}; meal notes focus on tolerance and gentle swaps.`;
  if (/basketball|gym|padel|paddle|run|performance|training|sport/.test(context)) return `Performance lens active: ${activityText}; timing and carbs are the main levers.`;
  if (/kid|child|daughter|grow|school|playground/.test(context) || profile.role === 'child') return `Kid lens active: ${mealCount(day)} meals today, with simple reasons and fun food cues coming next.`;
  return `${profile.goal || 'Personal lens'}: ${activityText}; open My specifics on any meal for tailored adjustments.`;
}

function dayLensSummary(day, activities, persona) {
  const count = activitiesForPersona(activities.filter(activity => Number(activity.dayNumber) === Number(day.dayNumber)), persona).length;
  if (persona.type === 'family') return count ? `${count} family events` : 'Shared routine';
  return count ? `${persona.profile.name}: ${count} event${count === 1 ? '' : 's'}` : `${persona.profile.name}: meals only`;
}

function mealCount(day) {
  return day?.meals?.length || 0;
}

function personaLabel(personaId, family) {
  if (personaId === 'family') return 'Family';
  return (family?.profiles || []).find(profile => profile.id === personaId)?.name || 'Choose user';
}

function personaInitials(personaId, family) {
  if (personaId === 'family') return 'FA';
  const profile = (family?.profiles || []).find(item => item.id === personaId);
  return profile?.name?.slice(0, 2).toUpperCase() || 'ME';
}

function personaDescription(profile) {
  const text = `${profile.goal || ''} ${profile.restrictions || ''} ${profile.activities || ''} ${profile.preferences || ''}`.toLowerCase();
  if (/gut|reflux|bloat|lactose|sensitive|headache|stomach/.test(text)) return 'Wellbeing and comfort lens.';
  if (/basketball|gym|padel|paddle|run|performance|training|sport/.test(text)) return 'Performance and training lens.';
  if (/kid|child|daughter|grow|school|playground/.test(text) || profile.role === 'child') return 'Simple food story lens.';
  return profile.goal || 'Personal meal lens.';
}

function MealEmoji({ meal }) {
  const map = { bowl: '🥣 🫐', egg: '🍳', fish: '🐟', rice: '🍚', potato: '🥔', nuts: '🌰', fruit: '🍇', plate: '🍽️' };
  return <span aria-hidden="true" className="emoji">{map[meal.icon] || map.plate}</span>;
}

function Empty({ title }) {
  return <section className="card empty"><h2>{title}</h2><p>Create at least one profile, then generate the first dynamic routine.</p></section>;
}

function weekOf(dayNumber) {
  return Math.ceil(dayNumber / 7);
}

function weekDays(plan, weekNumber) {
  return (plan?.days || []).filter(day => weekOf(day.dayNumber) === weekNumber).slice(0, 7);
}

function weekRange(week) {
  if (!week.length) return '';
  const a = dateForDay(week[0].dayNumber);
  const b = dateForDay(week[week.length - 1].dayNumber);
  const month = a.toLocaleDateString('en-US', { month: 'short' });
  return `${month} ${a.getDate()}–${b.getDate()}`;
}

function isToday(day) {
  const date = dateForDay(day.dayNumber);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function agendaItems(day, activities, persona) {
  if (!day) return [];
  return [
    ...day.meals.map(meal => mealForPersonaAgenda(meal, persona)),
    ...groupActivities(activities.filter(activity => Number(activity.dayNumber) === Number(day.dayNumber)))
  ].sort((a, b) => toMinutes(a.time) - toMinutes(b.time) || (a.kind === 'activity' ? -1 : 1));
}

function mealForPersonaAgenda(meal, persona) {
  if (persona.type !== 'person') return { ...meal, kind: 'meal', familyTime: meal.time };
  const personalTiming = timingsForPersona(meal.memberTimings || [], persona)[0];
  return {
    ...meal,
    kind: 'meal',
    familyTime: meal.time,
    time: personalTiming?.time || meal.time
  };
}

function groupActivities(activities) {
  const groups = new Map();
  for (const activity of activities) {
    const key = `${activity.time}|${activity.type}`.toLowerCase();
    const current = groups.get(key) || {
      id: `activity-group-${key}`,
      kind: 'activity',
      time: activity.time,
      type: activity.type,
      people: []
    };
    current.people.push({
      id: activity.id,
      profileId: activity.profileId,
      profileName: activity.profileName,
      dayNumber: activity.dayNumber,
      type: activity.type,
      time: activity.time,
      createdAt: activity.createdAt
    });
    groups.set(key, current);
  }
  return [...groups.values()];
}

function toMinutes(time) {
  const [hours, minutes] = String(time || '00:00').split(':').map(Number);
  return hours * 60 + minutes;
}

function dateForDay(dayNumber) {
  const date = new Date(planStart);
  date.setDate(planStart.getDate() + dayNumber - 1);
  return date;
}

function inferTags(title) {
  const text = title.toLowerCase();
  const tags = [];
  if (/salmon|hake|cod|prawn|bonito|tuna|egg|yogurt|cheese/.test(text)) tags.push({ label: 'Protein', tone: 'blue' });
  if (/rice|potato|quinoa|pasta|bread|toast|oat/.test(text)) tags.push({ label: 'Carbs', tone: 'orange' });
  if (/salmon|walnut|blueberry|kiwi|spinach|egg/.test(text)) tags.push({ label: 'Hair support', tone: 'green' });
  if (!/tomato|onion|garlic|coffee/.test(text)) tags.push({ label: 'Gut-safe base', tone: 'purple' });
  return tags.slice(0, 3);
}

createRoot(document.getElementById('root')).render(<App />);
