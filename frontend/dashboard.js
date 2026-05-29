/* ===== VITALIS AI — DASHBOARD ENGINE ===== */

// ============================================================
// STORAGE MANAGER
// ============================================================
const Store = {
  get: (key, fallback = null) => {
    try { const v = localStorage.getItem('vitalis_' + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set: (key, val) => { try { localStorage.setItem('vitalis_' + key, JSON.stringify(val)); } catch {} },
  today: () => new Date().toISOString().split('T')[0],
  getToday: (key, fallback) => {
    const all = Store.get(key, {}); return all[Store.today()] !== undefined ? all[Store.today()] : fallback;
  },
  setToday: (key, val) => {
    const all = Store.get(key, {}); all[Store.today()] = val; Store.set(key, all);
  },
  getLast7: (key, fallback) => {
    const all = Store.get(key, {}); const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().split('T')[0];
      days.push(all[k] !== undefined ? all[k] : fallback);
    }
    return days;
  }
};

// ============================================================
// PROFILE & SETTINGS
// ============================================================
const DEFAULT_PROFILE = { fname: 'Alex', lname: 'Johnson', email: 'alex@example.com', waterGoal: 8, sleepGoal: 7.5 };
const DEFAULT_SETTINGS = { reminders: true, aiInsights: true, hydrationAlerts: true, moodReminders: true };

function getProfile() { return { ...DEFAULT_PROFILE, ...Store.get('profile', {}) }; }
function getSettings() { return { ...DEFAULT_SETTINGS, ...Store.get('settings', {}) }; }

function saveProfile() {
  const p = {
    fname: document.getElementById('profile-fname').value.trim() || 'Alex',
    lname: document.getElementById('profile-lname').value.trim() || 'Johnson',
    email: document.getElementById('profile-email').value.trim() || 'alex@example.com',
    waterGoal: parseInt(document.getElementById('profile-water-goal').value) || 8,
    sleepGoal: parseFloat(document.getElementById('profile-sleep-goal').value) || 7.5
  };
  Store.set('profile', p);
  renderProfile();
  updateDashboardHeader();
  notify('Profile Saved', 'Your profile has been updated successfully.', 'fa-user');
}

function renderProfile() {
  const p = getProfile();
  const name = p.fname + ' ' + p.lname;
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.value = val; };
  el('profile-fname', p.fname); el('profile-lname', p.lname);
  el('profile-email', p.email); el('profile-water-goal', p.waterGoal);
  el('profile-sleep-goal', p.sleepGoal);
  const dn = document.getElementById('profile-display-name'); if (dn) dn.textContent = name;
  const de = document.getElementById('profile-display-email'); if (de) de.textContent = p.email;
  const al = document.getElementById('profile-avatar-letter'); if (al) al.textContent = p.fname[0].toUpperCase();
  const stats = document.getElementById('profile-stats');
  if (stats) {
    const history = Store.get('wellness_history', {});
    const scores = Object.values(history);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const chatCount = Store.get('chat_history', []).length;
    const streak = calcStreak();
    stats.innerHTML = [
      ['Total Days Tracked', Object.keys(history).length || 0],
      ['Avg Wellness Score', avg ? avg + ' / 100' : 'N/A'],
      ['Longest Streak', streak + ' days'],
      ['AI Conversations', chatCount],
      ['Water Goal', p.waterGoal + ' glasses/day'],
      ['Sleep Goal', p.sleepGoal + ' hrs/night']
    ].map(([label, val]) => `
      <div style="display:flex;justify-content:space-between;padding:14px;background:var(--glass);border:1px solid var(--border);border-radius:8px;">
        <span style="font-size:13px;color:var(--text-secondary);">${label}</span>
        <span style="font-size:13px;font-weight:500;">${val}</span>
      </div>`).join('');
  }
}

// ============================================================
// WELLNESS SCORE ENGINE
// ============================================================
function calcWellnessScore() {
  const p = getProfile();
  const sleep = Store.getToday('sleep_hours', null);
  const hydration = Store.getToday('hydration', 0);
  const moodVal = Store.getToday('mood_value', null);
  const routines = Store.getToday('routines_done', []);
  const totalRoutines = ROUTINES.length;

  let sleepScore = 0, hydScore = 0, moodScore = 0, routineScore = 0;

  if (sleep !== null) {
    const ratio = sleep / p.sleepGoal;
    sleepScore = Math.min(100, Math.round(ratio >= 1 ? 100 : ratio >= 0.8 ? 85 : ratio >= 0.6 ? 65 : 40));
  }
  hydScore = Math.round((hydration / p.waterGoal) * 100);
  if (moodVal !== null) moodScore = Math.round((moodVal / 5) * 100);
  if (totalRoutines > 0) routineScore = Math.round((routines.length / totalRoutines) * 100);

  const hasData = sleep !== null || hydration > 0 || moodVal !== null;
  if (!hasData) return { score: null, sleep: sleepScore, hydration: hydScore, mood: moodScore, routine: routineScore };

  const weights = { sleep: 0.35, hydration: 0.25, mood: 0.25, routine: 0.15 };
  const score = Math.round(
    (sleepScore * weights.sleep) +
    (hydScore * weights.hydration) +
    (moodScore * weights.mood) +
    (routineScore * weights.routine)
  );
  return { score, sleep: sleepScore, hydration: hydScore, mood: moodScore, routine: routineScore };
}

function calcStreak() {
  const history = Store.get('wellness_history', {});
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const k = d.toISOString().split('T')[0];
    if (history[k] !== undefined) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function updateWellnessDisplay() {
  const ws = calcWellnessScore();
  const score = ws.score;

  // Save to history if we have a score
  if (score !== null) {
    const hist = Store.get('wellness_history', {});
    hist[Store.today()] = score;
    Store.set('wellness_history', hist);
  }

  const displayScore = score !== null ? score : '—';
  const label = score === null ? 'Log data' : score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'Fair' : 'Needs Work';

  setText('stat-wellness', displayScore + '<span class="dash-card-unit">/ 100</span>');
  setText('ring-score-val', displayScore);
  setText('ring-score-label', label);

  // Animate ring
  const ring = document.getElementById('wellness-ring-fill');
  if (ring && score !== null) {
    const circumference = 364.4;
    const offset = circumference - (score / 100) * circumference;
    setTimeout(() => { ring.style.strokeDashoffset = offset; }, 200);
  }

  // Mini bars
  const bars = [
    ['bar-sleep', 'bar-sleep-val', ws.sleep],
    ['bar-hydration', 'bar-hydration-val', ws.hydration],
    ['bar-mood', 'bar-mood-val', ws.mood],
    ['bar-routine', 'bar-routine-val', ws.routine]
  ];
  bars.forEach(([barId, valId, val]) => {
    const bar = document.getElementById(barId);
    const valEl = document.getElementById(valId);
    if (bar) setTimeout(() => { bar.style.width = val + '%'; }, 300);
    if (valEl) valEl.textContent = val || '—';
  });

  // Trend
  const hist = Store.get('wellness_history', {});
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yk = yesterday.toISOString().split('T')[0];
  const yScore = hist[yk];
  const trendEl = document.getElementById('stat-wellness-trend');
  if (trendEl && score !== null && yScore !== undefined) {
    const diff = score - yScore;
    trendEl.textContent = diff > 0 ? `↑ ${diff} points from yesterday` : diff < 0 ? `↓ ${Math.abs(diff)} points from yesterday` : 'Same as yesterday';
  } else if (trendEl && score !== null) {
    trendEl.textContent = 'First entry today';
  }

  // Streak
  const streak = calcStreak();
  setText('stat-streak', streak + '<span class="dash-card-unit">days</span>');
  const streakTrend = document.getElementById('stat-streak-trend');
  if (streakTrend) streakTrend.innerHTML = streak >= 7 ? '<span class="streak-fire">🔥</span> Personal best!' : streak > 0 ? 'Keep it going!' : 'Start your streak today';
}

// ============================================================
// HYDRATION
// ============================================================
function initHydrationDrops(containerId, count) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const p = getProfile();
  const goal = p.waterGoal;
  const filled = Store.getToday('hydration', 0);
  for (let i = 0; i < goal; i++) {
    const drop = document.createElement('div');
    drop.className = 'drop' + (i < filled ? ' filled' : '');
    drop.addEventListener('click', () => {
      const cur = Store.getToday('hydration', 0);
      const newVal = i < cur ? i : i + 1;
      Store.setToday('hydration', Math.min(newVal, goal));
      refreshHydration();
      updateWellnessDisplay();
      generateAIRecs();
      flashCard('card-hydration');
      if (newVal >= goal) notify('Hydration Goal Reached! 💧', 'You hit your daily water goal. Great job!', 'fa-droplet');
    });
    container.appendChild(drop);
  }
}

function refreshHydration() {
  const p = getProfile();
  const goal = p.waterGoal;
  const filled = Store.getToday('hydration', 0);

  // Update all drop containers
  ['hydration-drops', 'hydration-drops-full'].forEach(id => {
    const container = document.getElementById(id);
    if (!container) return;
    container.querySelectorAll('.drop').forEach((drop, i) => {
      drop.classList.toggle('filled', i < filled);
    });
  });

  setText('hydration-text', filled + ' of ' + goal + ' glasses');
  setText('stat-hydration', filled + '<span class="dash-card-unit">/ ' + goal + '</span>');
  setText('hydration-big-num', filled);

  const pct = Math.round((filled / goal) * 100);
  const trend = document.getElementById('stat-hydration-trend');
  if (trend) trend.textContent = pct + '% of daily goal';

  const fill = document.getElementById('hydration-glass-fill');
  if (fill) fill.style.height = pct + '%';

  const goalDisplay = document.getElementById('hydration-goal-display');
  if (goalDisplay) goalDisplay.textContent = goal;

  renderHydrationInsights(filled, goal);
}

function addGlass() {
  const p = getProfile();
  const cur = Store.getToday('hydration', 0);
  if (cur < p.waterGoal) {
    Store.setToday('hydration', cur + 1);
    refreshHydration(); updateWellnessDisplay(); generateAIRecs();
    flashCard('card-hydration');
    if (cur + 1 >= p.waterGoal) notify('Hydration Goal Reached! 💧', 'You hit your daily water goal!', 'fa-droplet');
  }
}

function removeGlass() {
  const cur = Store.getToday('hydration', 0);
  if (cur > 0) { Store.setToday('hydration', cur - 1); refreshHydration(); updateWellnessDisplay(); }
}

function renderHydrationInsights(filled, goal) {
  const el = document.getElementById('hydration-insights');
  if (!el) return;
  const pct = Math.round((filled / goal) * 100);
  const insights = [];
  if (pct < 25) insights.push({ icon: 'fa-triangle-exclamation', text: 'Hydration is critically low. Drink water now to avoid fatigue and headaches.' });
  else if (pct < 50) insights.push({ icon: 'fa-droplet', text: 'You\'re below halfway. Try to drink a glass every 30 minutes.' });
  else if (pct < 75) insights.push({ icon: 'fa-circle-check', text: 'Good progress! A few more glasses will complete your goal.' });
  else if (pct < 100) insights.push({ icon: 'fa-star', text: 'Almost there! Just ' + (goal - filled) + ' more glass(es) to hit your goal.' });
  else insights.push({ icon: 'fa-trophy', text: 'Hydration goal complete! Your body is well-hydrated today.' });

  const mood = Store.getToday('mood_label', null);
  if (mood === 'Tired' || mood === 'Stressed') insights.push({ icon: 'fa-brain', text: 'Dehydration amplifies stress and fatigue. Keep drinking water consistently.' });

  el.innerHTML = insights.map(i => `
    <div class="ai-rec-item"><span class="ai-rec-icon"><i class="fa-solid ${i.icon}"></i></span>${i.text}</div>
  `).join('');
}

// ============================================================
// MOOD SYSTEM
// ============================================================
const MOODS = [
  { label: 'Calm', emoji: '😌', value: 4 },
  { label: 'Focused', emoji: '🎯', value: 5 },
  { label: 'Happy', emoji: '😊', value: 5 },
  { label: 'Energized', emoji: '⚡', value: 5 },
  { label: 'Tired', emoji: '😴', value: 2 },
  { label: 'Stressed', emoji: '😰', value: 2 },
  { label: 'Sad', emoji: '😔', value: 1 },
  { label: 'Anxious', emoji: '😟', value: 2 },
  { label: 'Angry', emoji: '😤', value: 1 },
  { label: 'Neutral', emoji: '😐', value: 3 }
];

function renderMoodGrid(containerId, compact = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const saved = Store.getToday('mood_label', null);
  const moods = compact ? MOODS.slice(0, 6) : MOODS;
  container.innerHTML = moods.map(m => `
    <button class="mood-btn ${saved === m.label ? 'active' : ''}" onclick="selectMood('${m.label}', '${containerId}')">
      ${m.emoji} ${m.label}
    </button>`).join('');
}

function selectMood(label, containerId) {
  const mood = MOODS.find(m => m.label === label);
  if (!mood) return;
  Store.setToday('mood_label', label);
  Store.setToday('mood_value', mood.value);
  // Update all mood grids
  ['mood-grid', 'mood-grid-full'].forEach(id => {
    document.querySelectorAll(`#${id} .mood-btn`).forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim().includes(label));
    });
  });
  const savedText = document.getElementById('mood-saved-text');
  if (savedText) savedText.textContent = 'Mood saved: ' + mood.emoji + ' ' + label;
  updateWellnessDisplay();
  generateAIRecs();
  renderMoodInsight();
  flashCard('card-wellness');
  notify('Mood Logged', 'Your mood has been recorded: ' + mood.emoji + ' ' + label, 'fa-face-smile');
}

function saveMoodEntry() {
  const note = document.getElementById('mood-note');
  const label = Store.getToday('mood_label', null);
  if (!label) { notify('Select a Mood', 'Please select how you\'re feeling first.', 'fa-triangle-exclamation'); return; }
  const entries = Store.get('mood_entries', []);
  entries.push({ date: Store.today(), label, value: Store.getToday('mood_value', 3), note: note ? note.value : '', time: new Date().toLocaleTimeString() });
  Store.set('mood_entries', entries);
  if (note) note.value = '';
  renderMoodHistory();
  renderMoodInsight();
  notify('Mood Entry Saved', 'Your mood and note have been recorded.', 'fa-check');
}

function renderMoodHistory() {
  const container = document.getElementById('mood-history-row');
  if (!container) return;
  const moodData = Store.getLast7('mood_label', null);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay();
  container.innerHTML = moodData.map((m, i) => {
    const mood = MOODS.find(x => x.label === m);
    const dayIdx = (today - 6 + i + 7) % 7;
    return `<div class="mood-day">
      <div class="mood-day-emoji">${mood ? mood.emoji : '○'}</div>
      <div class="mood-day-label">${days[dayIdx]}</div>
    </div>`;
  }).join('');
}

function renderMoodInsight() {
  const el = document.getElementById('mood-ai-insight');
  if (!el) return;
  const last7 = Store.getLast7('mood_label', null).filter(Boolean);
  if (!last7.length) { el.textContent = 'Log your mood daily to receive AI emotional insights.'; return; }
  const negCount = last7.filter(m => ['Stressed', 'Sad', 'Anxious', 'Angry', 'Tired'].includes(m)).length;
  const posCount = last7.filter(m => ['Happy', 'Focused', 'Energized', 'Calm'].includes(m)).length;
  let insight = '';
  if (negCount >= 4) insight = '⚠️ Your mood has been predominantly negative this week. Consider speaking to someone you trust, reducing workload, or trying a mindfulness practice.';
  else if (negCount >= 2) insight = '📊 Mixed emotional week detected. Your stress levels appear elevated on some days. Consistent sleep and hydration can significantly improve mood stability.';
  else if (posCount >= 5) insight = '✨ Excellent emotional week! Your mood has been consistently positive. Keep maintaining your current wellness habits.';
  else insight = '📈 Your mood is trending positively. Continue logging daily for deeper AI insights into your emotional patterns.';
  el.textContent = insight;
}

// ============================================================
// SLEEP SYSTEM
// ============================================================
function saveSleep() {
  const bedtime = document.getElementById('sleep-bedtime').value;
  const waketime = document.getElementById('sleep-waketime').value;
  const quality = parseInt(document.getElementById('sleep-quality').value);
  if (!bedtime || !waketime) return;

  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = waketime.split(':').map(Number);
  let hours = (wh + wm / 60) - (bh + bm / 60);
  if (hours < 0) hours += 24;
  hours = Math.round(hours * 10) / 10;

  Store.setToday('sleep_hours', hours);
  Store.setToday('sleep_quality', quality);
  Store.setToday('sleep_bedtime', bedtime);
  Store.setToday('sleep_waketime', waketime);

  const log = Store.get('sleep_log', {});
  log[Store.today()] = { hours, quality, bedtime, waketime };
  Store.set('sleep_log', log);

  closeModal('sleep-modal');
  refreshSleepDisplay();
  updateWellnessDisplay();
  generateAIRecs();
  flashCard('card-sleep');
  notify('Sleep Logged', `${hours} hours recorded. Quality: ${['', 'Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'][quality]}`, 'fa-moon');
}

function refreshSleepDisplay() {
  const hours = Store.getToday('sleep_hours', null);
  const p = getProfile();
  const sleepEl = document.getElementById('stat-sleep');
  const trendEl = document.getElementById('stat-sleep-trend');
  if (sleepEl) sleepEl.innerHTML = (hours !== null ? hours : '—') + '<span class="dash-card-unit">hrs</span>';
  if (trendEl && hours !== null) {
    const diff = hours - p.sleepGoal;
    trendEl.textContent = diff >= 0 ? `↑ ${Math.abs(diff).toFixed(1)}hrs above goal` : `↓ ${Math.abs(diff).toFixed(1)}hrs below goal`;
  }
  renderSleepLog();
  renderSleepInsights();
}

function renderSleepLog() {
  const el = document.getElementById('sleep-log-list');
  if (!el) return;
  const log = Store.get('sleep_log', {});
  const entries = Object.entries(log).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5);
  if (!entries.length) { el.innerHTML = '<div style="font-size:13px;color:var(--text-muted);padding:12px 0;">No sleep entries yet. Log your first night.</div>'; return; }
  el.innerHTML = entries.map(([date, data]) => {
    const d = new Date(date + 'T12:00:00');
    const label = date === Store.today() ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const qualityLabels = ['', 'Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'];
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--glass);border:1px solid var(--border);border-radius:8px;">
      <div><div style="font-size:13px;font-weight:500;">${label}</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${data.bedtime} → ${data.waketime}</div></div>
      <div style="text-align:right;"><div style="font-size:16px;font-weight:300;">${data.hours}h</div><div style="font-size:10px;color:var(--text-muted);">${qualityLabels[data.quality] || ''}</div></div>
    </div>`;
  }).join('');
}

function renderSleepInsights() {
  const el = document.getElementById('sleep-insights');
  if (!el) return;
  const hours = Store.getToday('sleep_hours', null);
  const p = getProfile();
  const last7 = Store.getLast7('sleep_hours', null).filter(v => v !== null);
  const avg = last7.length ? (last7.reduce((a, b) => a + b, 0) / last7.length).toFixed(1) : null;
  const insights = [];
  if (hours === null) insights.push({ icon: 'fa-moon', text: 'Log tonight\'s sleep to receive personalized recovery insights.' });
  else if (hours < 5) insights.push({ icon: 'fa-triangle-exclamation', text: 'Critical sleep deficit detected. Less than 5 hours severely impacts cognitive function and immunity.' });
  else if (hours < p.sleepGoal) insights.push({ icon: 'fa-circle-half-stroke', text: `You slept ${hours}h, ${(p.sleepGoal - hours).toFixed(1)}h below your goal. Try sleeping 30 minutes earlier tonight.` });
  else insights.push({ icon: 'fa-star', text: `Great sleep! ${hours}h meets your ${p.sleepGoal}h goal. Your body is recovering well.` });
  if (avg) insights.push({ icon: 'fa-chart-line', text: `7-day average: ${avg} hours. ${parseFloat(avg) >= p.sleepGoal ? 'Consistent sleep schedule detected.' : 'Try to improve consistency.'}` });
  el.innerHTML = insights.map(i => `<div class="ai-rec-item"><span class="ai-rec-icon"><i class="fa-solid ${i.icon}"></i></span>${i.text}</div>`).join('');
}

// Breathing exercise
let breathingActive = false, breathingTimer = null;
function startBreathing() {
  const circle = document.getElementById('breathing-circle');
  const label = document.getElementById('breathing-label');
  if (!circle || !label) return;
  if (breathingActive) { clearTimeout(breathingTimer); breathingActive = false; circle.className = 'breathing-circle'; circle.textContent = 'Tap to start'; label.textContent = '4-7-8 Breathing Technique'; return; }
  breathingActive = true;
  const phases = [
    { text: 'Inhale...', duration: 4000, class: 'inhale' },
    { text: 'Hold...', duration: 7000, class: '' },
    { text: 'Exhale...', duration: 8000, class: 'exhale' }
  ];
  let phaseIdx = 0;
  function runPhase() {
    if (!breathingActive) return;
    const phase = phases[phaseIdx % phases.length];
    circle.className = 'breathing-circle ' + phase.class;
    circle.textContent = phase.text;
    label.textContent = `${phase.text.replace('...', '')} — ${phase.duration / 1000}s`;
    phaseIdx++;
    breathingTimer = setTimeout(runPhase, phase.duration);
  }
  runPhase();
}

// ============================================================
// ROUTINES SYSTEM
// ============================================================
const ROUTINES = [
  { id: 'r1', time: '07:00 AM', name: 'Morning Breathing', desc: '5 min · Stress relief', ai: true },
  { id: 'r2', time: '07:30 AM', name: 'Hydration Start', desc: '2 glasses · Morning', ai: false },
  { id: 'r3', time: '08:00 AM', name: 'Healthy Breakfast', desc: 'Nutrient-rich · AI pick', ai: true },
  { id: 'r4', time: '12:00 PM', name: 'Mindful Lunch', desc: 'Iron-rich foods · AI pick', ai: true },
  { id: 'r5', time: '02:00 PM', name: 'Hydration Check', desc: '2 glasses · Afternoon', ai: false },
  { id: 'r6', time: '06:00 PM', name: 'Evening Walk', desc: '20 min · Light activity', ai: false },
  { id: 'r7', time: '09:00 PM', name: 'Hydration Final', desc: '1 glass · Evening', ai: false },
  { id: 'r8', time: '10:00 PM', name: 'Wind Down', desc: 'No screens · Dim lights', ai: true }
];

function renderRoutines(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const done = Store.getToday('routines_done', []);
  el.innerHTML = ROUTINES.map(r => `
    <div class="routine-item ${done.includes(r.id) ? 'done' : ''}" onclick="toggleRoutine('${r.id}', '${containerId}')">
      <div class="routine-check">${done.includes(r.id) ? '<i class="fa-solid fa-check" style="font-size:9px;"></i>' : ''}</div>
      <div class="routine-time">${r.time}</div>
      <div style="flex:1;"><div class="routine-name">${r.name}</div><div class="routine-meta">${r.desc}</div></div>
      ${r.ai ? '<span class="routine-ai-badge">AI Pick</span>' : ''}
    </div>`).join('');
  updateRoutineProgress();
}

function toggleRoutine(id, containerId) {
  const done = Store.getToday('routines_done', []);
  const idx = done.indexOf(id);
  if (idx > -1) done.splice(idx, 1); else done.push(id);
  Store.setToday('routines_done', done);
  renderRoutines(containerId);
  if (containerId !== 'routines-today') renderRoutines('routines-today');
  updateWellnessDisplay();
  updateRoutineProgress();
  if (done.length === ROUTINES.length) notify('All Routines Complete! 🎉', 'You completed every routine today. Incredible consistency!', 'fa-trophy');
}

function updateRoutineProgress() {
  const done = Store.getToday('routines_done', []);
  const el = document.getElementById('routines-progress-text');
  if (el) el.textContent = `${done.length} / ${ROUTINES.length} completed`;
}

function renderRoutinePredictions() {
  const el = document.getElementById('routine-predictions');
  if (!el) return;
  const sleep = Store.getToday('sleep_hours', null);
  const mood = Store.getToday('mood_label', null);
  const hydration = Store.getToday('hydration', 0);
  const p = getProfile();
  const predictions = [];
  if (sleep !== null && sleep < p.sleepGoal - 1) predictions.push({ icon: 'fa-moon', text: 'Sleep deficit detected. Add a 20-min power nap at 2 PM to restore energy.' });
  if (hydration < p.waterGoal / 2) predictions.push({ icon: 'fa-droplet', text: 'Hydration is low. Set a reminder to drink every 45 minutes this afternoon.' });
  if (mood === 'Stressed' || mood === 'Anxious') predictions.push({ icon: 'fa-wind', text: 'Stress detected. A 10-minute walk at 5 PM is predicted to reduce cortisol by 20%.' });
  if (mood === 'Tired') predictions.push({ icon: 'fa-bolt', text: 'Low energy predicted. Iron-rich foods at lunch will help restore vitality.' });
  predictions.push({ icon: 'fa-wand-magic-sparkles', text: 'Based on your patterns, your peak focus window is 9–11 AM. Schedule deep work then.' });
  el.innerHTML = predictions.map(p => `<div class="ai-rec-item"><span class="ai-rec-icon"><i class="fa-solid ${p.icon}"></i></span>${p.text}</div>`).join('');
}

// ============================================================
// AI RECOMMENDATIONS ENGINE
// ============================================================
function generateAIRecs() {
  const el = document.getElementById('ai-recs-list');
  if (!el) return;
  const p = getProfile();
  const sleep = Store.getToday('sleep_hours', null);
  const hydration = Store.getToday('hydration', 0);
  const mood = Store.getToday('mood_label', null);
  const recs = [];

  if (hydration < p.waterGoal) {
    const remaining = p.waterGoal - hydration;
    recs.push({ icon: 'fa-droplet', text: `Drink ${remaining} more glass${remaining > 1 ? 'es' : ''} of water today to reach your hydration goal.` });
  }
  if (sleep !== null && sleep < p.sleepGoal) {
    recs.push({ icon: 'fa-moon', text: `You slept ${sleep}h, below your ${p.sleepGoal}h goal. Aim to sleep ${(p.sleepGoal - sleep).toFixed(1)}h earlier tonight.` });
  } else if (sleep === null) {
    recs.push({ icon: 'fa-moon', text: 'Log your sleep to receive personalized recovery recommendations.' });
  }
  if (mood === 'Stressed' || mood === 'Anxious') {
    recs.push({ icon: 'fa-wind', text: 'Stress detected. Try 5 minutes of deep breathing or a short walk to reset your nervous system.' });
    recs.push({ icon: 'fa-leaf', text: 'Magnesium-rich foods like dark chocolate, nuts, or spinach can help reduce anxiety naturally.' });
  } else if (mood === 'Tired') {
    recs.push({ icon: 'fa-bolt', text: 'Low energy detected. Iron-rich foods like lentils, spinach, or dates can help restore vitality.' });
  } else if (mood === 'Sad') {
    recs.push({ icon: 'fa-sun', text: 'Mood is low. Sunlight exposure and light exercise release endorphins and can lift your spirits.' });
  }
  if (!recs.length) recs.push({ icon: 'fa-star', text: 'Your wellness looks great today! Keep maintaining your current habits.' });
  recs.push({ icon: 'fa-heart-pulse', text: 'Consistency is your superpower. Every logged day builds a stronger wellness foundation.' });

  el.innerHTML = recs.slice(0, 4).map(r => `
    <div class="ai-rec-item"><span class="ai-rec-icon"><i class="fa-solid ${r.icon}"></i></span>${r.text}</div>`).join('');
}

// ============================================================
// FOOD SUGGESTIONS ENGINE
// ============================================================
const FOOD_DB = {
  Stressed: [
    { emoji: '🍫', name: 'Dark Chocolate', benefit: 'Reduces cortisol', tag: 'Stress Relief' },
    { emoji: '🥑', name: 'Avocado', benefit: 'Rich in magnesium', tag: 'Calming' },
    { emoji: '🫐', name: 'Blueberries', benefit: 'Antioxidant boost', tag: 'Brain Health' },
    { emoji: '🍵', name: 'Green Tea', benefit: 'L-theanine calms mind', tag: 'Relaxing' },
    { emoji: '🥜', name: 'Almonds', benefit: 'Vitamin E & magnesium', tag: 'Stress Relief' },
    { emoji: '🐟', name: 'Salmon', benefit: 'Omega-3 reduces anxiety', tag: 'Anti-Anxiety' }
  ],
  Tired: [
    { emoji: '🌿', name: 'Spinach', benefit: 'Iron boosts energy', tag: 'Energy' },
    { emoji: '🍌', name: 'Banana', benefit: 'Natural energy boost', tag: 'Quick Energy' },
    { emoji: '🥚', name: 'Eggs', benefit: 'Protein & B vitamins', tag: 'Sustained Energy' },
    { emoji: '🫘', name: 'Lentils', benefit: 'Iron & complex carbs', tag: 'Energy' },
    { emoji: '🍊', name: 'Orange', benefit: 'Vitamin C & hydration', tag: 'Vitality' },
    { emoji: '☕', name: 'Coffee', benefit: 'Caffeine focus boost', tag: 'Alertness' }
  ],
  Happy: [
    { emoji: '🥗', name: 'Mixed Salad', benefit: 'Nutrient-dense & light', tag: 'Balanced' },
    { emoji: '🍓', name: 'Strawberries', benefit: 'Vitamin C & antioxidants', tag: 'Mood Boost' },
    { emoji: '🥦', name: 'Broccoli', benefit: 'Folate supports mood', tag: 'Wellness' },
    { emoji: '🍇', name: 'Grapes', benefit: 'Resveratrol & hydration', tag: 'Antioxidant' },
    { emoji: '🧀', name: 'Greek Yogurt', benefit: 'Probiotics for gut health', tag: 'Gut Health' },
    { emoji: '🥝', name: 'Kiwi', benefit: 'Serotonin precursors', tag: 'Mood' }
  ],
  default: [
    { emoji: '🌿', name: 'Spinach', benefit: 'Iron & folate rich', tag: 'Wellness' },
    { emoji: '🥑', name: 'Avocado', benefit: 'Healthy fats & potassium', tag: 'Heart Health' },
    { emoji: '🫐', name: 'Blueberries', benefit: 'Antioxidant powerhouse', tag: 'Brain Health' },
    { emoji: '🥜', name: 'Walnuts', benefit: 'Omega-3 & brain health', tag: 'Cognitive' },
    { emoji: '🍵', name: 'Herbal Tea', benefit: 'Hydration & calm', tag: 'Relaxing' },
    { emoji: '🥚', name: 'Eggs', benefit: 'Complete protein source', tag: 'Protein' }
  ]
};

function renderFoodSuggestions() {
  const grid = document.getElementById('food-grid');
  const context = document.getElementById('food-ai-context');
  if (!grid) return;
  const mood = Store.getToday('mood_label', null);
  const sleep = Store.getToday('sleep_hours', null);
  const hydration = Store.getToday('hydration', 0);
  const p = getProfile();
  const foods = FOOD_DB[mood] || FOOD_DB.default;
  grid.innerHTML = foods.map(f => `
    <div class="food-card" onclick="this.style.borderColor='rgba(255,255,255,0.3)'">
      <div class="food-emoji">${f.emoji}</div>
      <div class="food-name">${f.name}</div>
      <div class="food-benefit">${f.benefit}</div>
      <div class="food-tag">${f.tag}</div>
    </div>`).join('');
  if (context) {
    let text = 'Based on your current wellness data: ';
    if (mood) text += `mood is ${mood}, `;
    if (sleep !== null) text += `sleep was ${sleep}h (goal: ${p.sleepGoal}h), `;
    text += `hydration is ${hydration}/${p.waterGoal} glasses. `;
    text += mood ? `These foods are specifically selected to support your ${mood.toLowerCase()} state and optimize your energy and recovery.` : 'These foods are selected to support your overall wellness and energy levels today.';
    context.textContent = text;
  }
}

// ============================================================
// CHARTS ENGINE
// ============================================================
const CHART_DEFAULTS = {
  color: 'rgba(255,255,255,0.6)',
  gridColor: 'rgba(255,255,255,0.04)',
  tickColor: 'rgba(255,255,255,0.3)',
  font: { family: 'Inter', size: 11 }
};

function chartOptions(yLabel = '', min = 0, max = null) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: 'rgba(17,17,17,0.95)', borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1, titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.6)',
      padding: 12, cornerRadius: 8
    }},
    scales: {
      x: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { color: CHART_DEFAULTS.tickColor, font: CHART_DEFAULTS.font } },
      y: { min, ...(max ? { max } : {}), grid: { color: CHART_DEFAULTS.gridColor }, ticks: { color: CHART_DEFAULTS.tickColor, font: CHART_DEFAULTS.font } }
    }
  };
}

function getDayLabels() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    labels.push(i === 0 ? 'Today' : days[d.getDay()]);
  }
  return labels;
}

const activeCharts = {};
function destroyChart(id) { if (activeCharts[id]) { activeCharts[id].destroy(); delete activeCharts[id]; } }

function renderSleepChart(canvasId) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const data = Store.getLast7('sleep_hours', 0);
  const p = getProfile();
  activeCharts[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: getDayLabels(),
      datasets: [{
        data, backgroundColor: data.map(v => v >= p.sleepGoal ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'),
        borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderRadius: 4
      }, {
        type: 'line', data: Array(7).fill(p.sleepGoal),
        borderColor: 'rgba(255,255,255,0.2)', borderDash: [4, 4], borderWidth: 1,
        pointRadius: 0, fill: false
      }]
    },
    options: chartOptions('Hours', 0, 12)
  });
}

function renderHydrationChart(canvasId) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const data = Store.getLast7('hydration', 0);
  const p = getProfile();
  activeCharts[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: getDayLabels(),
      datasets: [{
        data, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 2, pointBackgroundColor: 'rgba(255,255,255,0.8)', pointRadius: 4, fill: true, tension: 0.4
      }]
    },
    options: chartOptions('Glasses', 0, p.waterGoal + 2)
  });
}

function renderMoodChart(canvasId) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const data = Store.getLast7('mood_value', null).map(v => v || 0);
  activeCharts[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: getDayLabels(),
      datasets: [{
        data, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 2, pointBackgroundColor: 'rgba(255,255,255,0.8)', pointRadius: 4, fill: true, tension: 0.4
      }]
    },
    options: chartOptions('Mood', 0, 5)
  });
}

function renderWellnessChart(canvasId) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const data = Store.getLast7('wellness_history', 0);
  activeCharts[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: getDayLabels(),
      datasets: [{
        data, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 2, pointBackgroundColor: '#fff', pointRadius: 4, fill: true, tension: 0.4
      }]
    },
    options: chartOptions('Score', 0, 100)
  });
}

function renderOverviewChart() {
  destroyChart('overview-chart');
  const canvas = document.getElementById('overview-chart');
  if (!canvas) return;
  const p = getProfile();
  const sleepData = Store.getLast7('sleep_hours', 0).map(v => Math.round((v / p.sleepGoal) * 100));
  const hydData = Store.getLast7('hydration', 0).map(v => Math.round((v / p.waterGoal) * 100));
  const moodData = Store.getLast7('mood_value', 0).map(v => Math.round((v / 5) * 100));
  activeCharts['overview-chart'] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: getDayLabels(),
      datasets: [
        { label: 'Sleep', data: sleepData, borderColor: 'rgba(255,255,255,0.7)', borderWidth: 2, pointRadius: 3, fill: false, tension: 0.4 },
        { label: 'Hydration', data: hydData, borderColor: 'rgba(255,255,255,0.4)', borderWidth: 2, pointRadius: 3, fill: false, tension: 0.4, borderDash: [4, 2] },
        { label: 'Mood', data: moodData, borderColor: 'rgba(255,255,255,0.25)', borderWidth: 2, pointRadius: 3, fill: false, tension: 0.4, borderDash: [2, 4] }
      ]
    },
    options: {
      ...chartOptions('Score %', 0, 100),
      plugins: {
        legend: { display: true, labels: { color: 'rgba(255,255,255,0.4)', font: { size: 11, family: 'Inter' }, boxWidth: 20 } },
        tooltip: { backgroundColor: 'rgba(17,17,17,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.6)', padding: 12, cornerRadius: 8 }
      }
    }
  });
}

function renderRoutineChart() {
  destroyChart('routine-chart');
  const canvas = document.getElementById('routine-chart');
  if (!canvas) return;
  const data = Store.getLast7('routines_done', []).map(v => Array.isArray(v) ? Math.round((v.length / ROUTINES.length) * 100) : 0);
  activeCharts['routine-chart'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: getDayLabels(),
      datasets: [{ data, backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderRadius: 4 }]
    },
    options: chartOptions('%', 0, 100)
  });
}

// ============================================================
// AI CHAT ENGINE
// ============================================================
const AI_KNOWLEDGE = {
  keywords: {
    stressed: ['stressed', 'stress', 'overwhelmed', 'pressure', 'tense', 'anxious', 'anxiety', 'nervous', 'worried', 'panic'],
    tired: ['tired', 'exhausted', 'fatigue', 'sleepy', 'drained', 'low energy', 'no energy', 'sluggish', 'weak'],
    sad: ['sad', 'depressed', 'unhappy', 'down', 'lonely', 'hopeless', 'empty', 'miserable', 'crying'],
    headache: ['headache', 'migraine', 'head hurts', 'head pain', 'throbbing'],
    sick: ['sick', 'ill', 'nauseous', 'nausea', 'vomiting', 'fever', 'cold', 'flu', 'unwell'],
    angry: ['angry', 'frustrated', 'irritated', 'annoyed', 'rage', 'furious', 'mad'],
    burnout: ['burnout', 'burn out', 'burnt out', 'overworked', 'no motivation', 'giving up'],
    sleep: ['sleep', 'insomnia', 'cant sleep', "can't sleep", 'woke up', 'tired morning', 'rest'],
    hydration: ['water', 'thirsty', 'dehydrated', 'drink', 'hydration'],
    food: ['eat', 'food', 'hungry', 'meal', 'diet', 'nutrition', 'snack'],
    happy: ['happy', 'great', 'good', 'amazing', 'wonderful', 'fantastic', 'excellent', 'feeling good'],
    score: ['score', 'wellness', 'how am i doing', 'progress', 'stats']
  },
  responses: {
    stressed: (data) => {
      const parts = [`I can sense you're under stress. Let me check your data.`];
      if (data.sleep !== null && data.sleep < data.sleepGoal) parts.push(`You slept only ${data.sleep}h last night (goal: ${data.sleepGoal}h) — sleep deprivation amplifies stress significantly.`);
      if (data.hydration < data.waterGoal / 2) parts.push(`Your hydration is at ${data.hydration}/${data.waterGoal} glasses. Dehydration increases cortisol levels.`);
      parts.push(`\n🌿 Immediate recommendations:\n• Try 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s\n• Drink a glass of warm water or herbal tea\n• Step outside for 5 minutes of fresh air\n• Eat magnesium-rich foods: dark chocolate, almonds, or spinach\n\nYou're doing better than you think. One breath at a time.`);
      return parts.join(' ');
    },
    tired: (data) => {
      const parts = [`Fatigue detected. Let me analyze your wellness data.`];
      if (data.sleep !== null) parts.push(`Sleep: ${data.sleep}h (goal: ${data.sleepGoal}h).`);
      if (data.hydration < 4) parts.push(`Hydration is very low at ${data.hydration} glasses — this is a major energy drain.`);
      parts.push(`\n⚡ Energy restoration plan:\n• Drink 2 glasses of water immediately\n• Eat iron-rich foods: spinach, lentils, dates, or eggs\n• Take a 10-20 minute power nap if possible\n• Avoid sugar — it causes energy crashes\n• Light movement like a short walk can boost energy by 20%`);
      return parts.join(' ');
    },
    sad: () => `I hear you, and I want you to know that what you're feeling is valid. 💙\n\nHere's what can help:\n• Sunlight exposure for 10 minutes boosts serotonin naturally\n• Light exercise releases endorphins — even a short walk helps\n• Connect with someone you trust\n• Foods rich in omega-3 (salmon, walnuts) support brain chemistry\n• Journaling your thoughts can provide emotional clarity\n\nYou're not alone in this. Small steps forward still count.`,
    headache: (data) => {
      let msg = `Headaches often signal dehydration or tension. `;
      if (data.hydration < 4) msg += `Your hydration is low (${data.hydration} glasses) — this is likely contributing.\n\n`;
      msg += `💊 Relief strategies:\n• Drink 2 glasses of water now\n• Apply gentle pressure to your temples\n• Rest in a dark, quiet room for 15 minutes\n• Avoid screens if possible\n• Magnesium-rich foods can prevent tension headaches`;
      return msg;
    },
    sick: () => `I'm sorry you're not feeling well. Here's how to support your recovery:\n\n🏥 Recovery protocol:\n• Hydrate aggressively — aim for 10+ glasses today\n• Rest is your most powerful medicine right now\n• Warm broths and soups support immunity\n• Vitamin C foods: oranges, kiwi, bell peppers\n• Ginger tea can help with nausea and inflammation\n• Avoid strenuous activity until you feel better`,
    angry: () => `Anger is energy — let's redirect it constructively.\n\n🧘 Immediate de-escalation:\n• Take 5 slow, deep breaths before responding to anything\n• Physical movement releases tension: a brisk walk or exercise\n• Write down what's bothering you — it externalizes the emotion\n• Cold water on your face activates the dive reflex and calms the nervous system\n\nYour feelings are valid. Give yourself space to process.`,
    burnout: (data) => `Burnout is your body's emergency signal. This is serious and needs attention.\n\n🔋 Recovery framework:\n• Immediately reduce your task load — say no to non-essentials\n• Sleep is non-negotiable: aim for ${data.sleepGoal}+ hours tonight\n• Disconnect from work notifications for at least 2 hours daily\n• Spend time in nature — it's clinically proven to reduce burnout\n• Eat nourishing, whole foods and stay hydrated\n• Consider speaking to a professional if this persists\n\nYou matter more than your productivity.`,
    sleep: (data) => {
      let msg = `Sleep is the foundation of all wellness. `;
      if (data.sleep !== null) msg += `You slept ${data.sleep}h last night (goal: ${data.sleepGoal}h). `;
      msg += `\n🌙 Sleep optimization tips:\n• Consistent bedtime is more important than duration\n• Avoid screens 1 hour before bed — blue light suppresses melatonin\n• Keep your room cool (65-68°F / 18-20°C)\n• Try the 4-7-8 breathing technique in the Sleep section\n• Avoid caffeine after 2 PM\n• Magnesium glycinate before bed can improve sleep quality`;
      return msg;
    },
    hydration: (data) => `Hydration status: ${data.hydration}/${data.waterGoal} glasses today.\n\n💧 Hydration intelligence:\n• Your brain is 75% water — even 2% dehydration impairs cognition\n• Drink a glass first thing in the morning to kickstart metabolism\n• Add lemon or cucumber for electrolytes\n• Eat water-rich foods: cucumber, watermelon, celery\n• Set hourly reminders if you forget to drink\n\nTarget: ${data.waterGoal - data.hydration} more glasses today.`,
    food: (data) => {
      const mood = data.mood || 'balanced';
      return `Based on your current state (${mood}), here are today's top food recommendations:\n\n🍽️ Personalized nutrition:\n• Check the Food Suggestions section for your full AI-curated menu\n• Focus on whole, unprocessed foods for sustained energy\n• Eat every 3-4 hours to maintain stable blood sugar\n• Include protein at every meal for satiety and muscle recovery\n• Colorful vegetables provide the widest range of micronutrients`;
    },
    happy: (data) => `That's wonderful to hear! 🌟 Your wellness data supports this — let's keep the momentum going.\n\n${data.score !== null ? `Your wellness score is ${data.score}/100 today. ` : ''}Here's how to sustain this positive state:\n• Log your mood to track what's working\n• This is a great time to tackle challenging tasks\n• Share your energy with others — it multiplies\n• Maintain your current sleep and hydration habits\n\nYou're thriving. Keep going.`,
    score: (data) => {
      if (data.score === null) return `I don't have enough data to calculate your score yet. Log your sleep, mood, and hydration to get your personalized wellness score.`;
      const label = data.score >= 85 ? 'Excellent' : data.score >= 70 ? 'Good' : data.score >= 55 ? 'Fair' : 'Needs Improvement';
      return `Your current wellness score is ${data.score}/100 — ${label}.\n\n📊 Score breakdown:\n• Sleep: ${data.sleepScore}%\n• Hydration: ${data.hydrationScore}%\n• Mood: ${data.moodScore}%\n• Routine: ${data.routineScore}%\n\n${data.score >= 80 ? 'Outstanding performance today!' : 'Focus on your lowest scoring area for the biggest improvement.'}`;
    },
    default: (data) => {
      const parts = [`I've analyzed your wellness data for today.`];
      if (data.sleep !== null) parts.push(`Sleep: ${data.sleep}h.`);
      parts.push(`Hydration: ${data.hydration}/${data.waterGoal} glasses.`);
      if (data.mood) parts.push(`Mood: ${data.mood}.`);
      if (data.score !== null) parts.push(`Wellness score: ${data.score}/100.`);
      parts.push(`\nWhat specific aspect of your wellness would you like to explore? I can help with sleep, stress, energy, nutrition, hydration, or your overall wellness score.`);
      return parts.join(' ');
    }
  }
};

function detectIntent(message) {
  const lower = message.toLowerCase();
  for (const [intent, keywords] of Object.entries(AI_KNOWLEDGE.keywords)) {
    if (keywords.some(kw => lower.includes(kw))) return intent;
  }
  return 'default';
}

function getAIContext() {
  const p = getProfile();
  const ws = calcWellnessScore();
  return {
    sleep: Store.getToday('sleep_hours', null),
    sleepGoal: p.sleepGoal,
    hydration: Store.getToday('hydration', 0),
    waterGoal: p.waterGoal,
    mood: Store.getToday('mood_label', null),
    score: ws.score,
    sleepScore: ws.sleep,
    hydrationScore: ws.hydration,
    moodScore: ws.mood,
    routineScore: ws.routine
  };
}

function generateAIResponse(message) {
  const intent = detectIntent(message);
  const context = getAIContext();
  const responseFn = AI_KNOWLEDGE.responses[intent] || AI_KNOWLEDGE.responses.default;
  return responseFn(context);
}

// Chat UI
function initChat() {
  const area = document.getElementById('chat-messages');
  if (!area) return;
  const history = Store.get('chat_history', []);
  area.innerHTML = '';
  if (!history.length) {
    const ctx = getAIContext();
    let greeting = `Hello! I'm Vitalis AI, your personal wellness intelligence system. `;
    if (ctx.sleep !== null) greeting += `I can see you slept ${ctx.sleep}h last night. `;
    if (ctx.hydration > 0) greeting += `Hydration is at ${ctx.hydration}/${ctx.waterGoal} glasses. `;
    greeting += `\n\nHow are you feeling today? I'm here to help with stress, sleep, nutrition, energy, or anything wellness-related.`;
    appendChatMessage('ai', greeting, false);
  } else {
    history.slice(-20).forEach(msg => appendChatMessage(msg.role, msg.text, false));
  }
  renderChatSuggestions();
  area.scrollTop = area.scrollHeight;
}

function appendChatMessage(role, text, save = true) {
  const area = document.getElementById('chat-messages');
  if (!area) return;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = `msg msg-${role}`;
  div.style.cssText = 'opacity:0;transform:translateY(8px);transition:all 0.4s ease;';
  if (role === 'ai') {
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div class="ai-avatar" style="width:28px;height:28px;font-size:10px;"><i class="fa-solid fa-brain"></i></div>
        <span style="font-size:11px;color:var(--text-muted);">Vitalis AI</span>
      </div>
      <div class="msg-bubble" style="white-space:pre-line;">${text}</div>
      <div class="chat-msg-time">${time}</div>`;
  } else {
    div.innerHTML = `<div class="msg-bubble">${text}</div><div class="chat-msg-time">${time}</div>`;
  }
  area.appendChild(div);
  requestAnimationFrame(() => { div.style.opacity = '1'; div.style.transform = 'translateY(0)'; });
  area.scrollTop = area.scrollHeight;
  if (save) {
    const history = Store.get('chat_history', []);
    history.push({ role, text, time });
    if (history.length > 100) history.splice(0, history.length - 100);
    Store.set('chat_history', history);
  }
}

function showTypingIndicator() {
  const area = document.getElementById('chat-messages');
  if (!area) return null;
  const div = document.createElement('div');
  div.className = 'msg msg-ai'; div.id = 'typing-temp';
  div.innerHTML = `<div class="ai-thinking"><div class="neural-pulse">${Array(5).fill('<div class="neural-dot"></div>').join('')}</div><span>Analyzing your wellness data...</span></div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
  return div;
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const btn = document.getElementById('chat-send-btn');
  const msg = input.value.trim();
  if (!msg || btn.disabled) return;
  appendChatMessage('user', msg);
  input.value = ''; input.style.height = '52px';
  btn.disabled = true;
  const status = document.getElementById('chat-status');
  if (status) status.textContent = 'Thinking...';
  const typing = showTypingIndicator();
  const delay = 1200 + Math.random() * 800;
  setTimeout(() => {
    if (typing) typing.remove();
    const response = generateAIResponse(msg);
    appendChatMessage('ai', response);
    btn.disabled = false;
    if (status) status.textContent = 'Online · Analyzing your wellness data';
    renderChatSuggestions();
  }, delay);
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
}

function autoResizeTextarea(el) {
  el.style.height = '52px'; el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function clearChatHistory() {
  Store.set('chat_history', []);
  initChat();
}

function renderChatSuggestions() {
  const el = document.getElementById('chat-suggestions');
  if (!el) return;
  const mood = Store.getToday('mood_label', null);
  const suggestions = [
    'How am I doing today?',
    mood === 'Stressed' ? 'Help me with stress' : 'I feel tired',
    'What should I eat?',
    'Improve my sleep',
    'My wellness score'
  ];
  el.innerHTML = suggestions.map(s => `<button class="chat-suggestion-btn" onclick="useSuggestion('${s}')">${s}</button>`).join('');
}

function useSuggestion(text) {
  const input = document.getElementById('chat-input');
  if (input) { input.value = text; sendChatMessage(); }
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function notify(title, message, icon = 'fa-bell', duration = 4000) {
  const container = document.getElementById('notification-container');
  if (!container) return;
  const notif = document.createElement('div');
  notif.className = 'notif';
  notif.innerHTML = `
    <div class="notif-icon"><i class="fa-solid ${icon}"></i></div>
    <div><div class="notif-title">${title}</div><div class="notif-msg">${message}</div></div>
    <div class="notif-bar" id="notif-bar-${Date.now()}"></div>`;
  notif.addEventListener('click', () => dismissNotif(notif));
  container.appendChild(notif);
  requestAnimationFrame(() => { requestAnimationFrame(() => { notif.classList.add('show'); }); });
  const bar = notif.querySelector('.notif-bar');
  if (bar) { bar.style.width = '100%'; setTimeout(() => { bar.style.transition = `width ${duration}ms linear`; bar.style.width = '0%'; }, 50); }
  setTimeout(() => dismissNotif(notif), duration);
}

function dismissNotif(notif) {
  notif.classList.add('hide');
  setTimeout(() => notif.remove(), 500);
}

// ============================================================
// DAILY INSIGHTS TICKER
// ============================================================
function updateTicker() {
  const el = document.getElementById('ticker-text');
  if (!el) return;
  const p = getProfile();
  const sleep = Store.getToday('sleep_hours', null);
  const hydration = Store.getToday('hydration', 0);
  const mood = Store.getToday('mood_label', null);
  const ws = calcWellnessScore();
  const insights = [
    ws.score !== null ? `Your wellness score today is ${ws.score}/100.` : 'Log your data to calculate your wellness score.',
    sleep !== null ? `You slept ${sleep}h last night — ${sleep >= p.sleepGoal ? 'meeting' : 'below'} your ${p.sleepGoal}h goal.` : 'Log your sleep to receive recovery insights.',
    `Hydration: ${hydration}/${p.waterGoal} glasses. ${hydration >= p.waterGoal ? 'Goal achieved!' : `${p.waterGoal - hydration} more to go.`}`,
    mood ? `Current mood: ${mood}. AI has personalized your recommendations accordingly.` : 'Log your mood for personalized AI insights.',
    'Consistency is the key to lasting wellness. Every logged day builds your health intelligence.',
    'Your AI wellness system learns from your patterns to predict and prevent health issues.',
    `Streak: ${calcStreak()} days of wellness tracking. Keep the momentum going.`
  ];
  const idx = Math.floor(Date.now() / 18000) % insights.length;
  el.textContent = insights[idx];
}

// ============================================================
// HABIT STREAKS
// ============================================================
function renderHabitStreaks() {
  const el = document.getElementById('habit-list');
  if (!el) return;
  const p = getProfile();
  const habits = [
    { icon: 'fa-droplet', name: 'Hydration Goal', check: () => Store.getToday('hydration', 0) >= p.waterGoal, key: 'streak_hydration' },
    { icon: 'fa-moon', name: 'Sleep Goal', check: () => { const s = Store.getToday('sleep_hours', null); return s !== null && s >= p.sleepGoal; }, key: 'streak_sleep' },
    { icon: 'fa-wind', name: 'Morning Breathing', check: () => Store.getToday('routines_done', []).includes('r1'), key: 'streak_breathing' },
    { icon: 'fa-leaf', name: 'Healthy Breakfast', check: () => Store.getToday('routines_done', []).includes('r3'), key: 'streak_breakfast' }
  ];
  el.innerHTML = habits.map(h => {
    const streak = calcHabitStreak(h.key, h.check);
    return `<div class="habit-item">
      <span><i class="fa-solid ${h.icon}" style="margin-right:8px;font-size:11px;"></i>${h.name}</span>
      <span class="habit-streak"><span class="streak-fire">🔥</span> ${streak} days</span>
    </div>`;
  }).join('');
}

function calcHabitStreak(key, checkFn) {
  const stored = Store.get(key + '_streak', 0);
  if (checkFn()) {
    const lastDate = Store.get(key + '_last', null);
    const today = Store.today();
    if (lastDate === today) return stored;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yk = yesterday.toISOString().split('T')[0];
    const newStreak = lastDate === yk ? stored + 1 : 1;
    Store.set(key + '_streak', newStreak);
    Store.set(key + '_last', today);
    return newStreak;
  }
  return stored;
}

// ============================================================
// SETTINGS
// ============================================================
function renderSettings() {
  const el = document.getElementById('settings-toggles');
  if (!el) return;
  const settings = getSettings();
  const toggles = [
    { key: 'reminders', label: 'Daily Wellness Reminders', desc: 'Get notified about your daily goals' },
    { key: 'aiInsights', label: 'AI Insights', desc: 'Receive personalized AI recommendations' },
    { key: 'hydrationAlerts', label: 'Hydration Alerts', desc: 'Reminders to drink water throughout the day' },
    { key: 'moodReminders', label: 'Mood Check-in Reminders', desc: 'Daily prompts to log your emotional state' }
  ];
  el.innerHTML = toggles.map(t => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:var(--glass);border:1px solid var(--border);border-radius:8px;">
      <div><div style="font-size:13px;">${t.label}</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${t.desc}</div></div>
      <label style="position:relative;width:40px;height:22px;cursor:pointer;flex-shrink:0;">
        <input type="checkbox" ${settings[t.key] ? 'checked' : ''} onchange="toggleSetting('${t.key}', this.checked)" style="opacity:0;width:0;height:0;" />
        <span style="position:absolute;inset:0;background:${settings[t.key] ? 'rgba(255,255,255,0.3)' : 'var(--border)'};border-radius:11px;transition:0.3s;" id="toggle-${t.key}"></span>
      </label>
    </div>`).join('');
}

function toggleSetting(key, val) {
  const settings = getSettings();
  settings[key] = val;
  Store.set('settings', settings);
  const span = document.getElementById('toggle-' + key);
  if (span) span.style.background = val ? 'rgba(255,255,255,0.3)' : 'var(--border)';
  notify('Setting Updated', `${key} has been ${val ? 'enabled' : 'disabled'}.`, 'fa-gear');
}

function exportData() {
  const data = {
    profile: getProfile(),
    wellness_history: Store.get('wellness_history', {}),
    sleep_log: Store.get('sleep_log', {}),
    mood_entries: Store.get('mood_entries', []),
    exported: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'vitalis-data.json'; a.click();
  URL.revokeObjectURL(url);
  notify('Data Exported', 'Your wellness data has been downloaded.', 'fa-download');
}

function resetDailyData() {
  const today = Store.today();
  ['hydration', 'mood_label', 'mood_value', 'sleep_hours', 'sleep_quality', 'routines_done'].forEach(key => {
    const all = Store.get(key, {}); delete all[today]; Store.set(key, all);
  });
  initDashboard();
  notify('Daily Data Reset', 'Today\'s data has been cleared.', 'fa-rotate');
}

function confirmClearAll() {
  if (confirm('This will permanently delete ALL your wellness data. This cannot be undone. Continue?')) {
    Object.keys(localStorage).filter(k => k.startsWith('vitalis_')).forEach(k => localStorage.removeItem(k));
    initDashboard();
    notify('All Data Cleared', 'Your wellness data has been reset.', 'fa-trash');
  }
}

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id) { const el = document.getElementById(id); if (el) el.classList.add('open'); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); }

// ============================================================
// SECTION NAVIGATION
// ============================================================
function showSection(name) {
  document.querySelectorAll('[id^="section-"]').forEach(s => { s.style.display = 'none'; });
  const el = document.getElementById('section-' + name);
  if (el) { el.style.display = 'block'; el.style.opacity = '0'; requestAnimationFrame(() => { el.style.transition = 'opacity 0.3s ease'; el.style.opacity = '1'; }); }
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  document.querySelectorAll(`.sidebar-nav a[data-section="${name}"]`).forEach(a => a.classList.add('active'));
  if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
  onSectionEnter(name);
}

function onSectionEnter(name) {
  if (name === 'analytics') {
    setTimeout(() => {
      renderSleepChart('sleep-analytics-chart');
      renderHydrationChart('hydration-analytics-chart');
      renderMoodChart('mood-analytics-chart');
      renderWellnessChart('wellness-analytics-chart');
      renderOverviewChart();
    }, 100);
  } else if (name === 'sleep') {
    renderSleepChart('sleep-chart');
    renderSleepLog();
    renderSleepInsights();
  } else if (name === 'hydration') {
    initHydrationDrops('hydration-drops-full', getProfile().waterGoal);
    refreshHydration();
    renderHydrationChart('hydration-chart');
  } else if (name === 'mood') {
    renderMoodGrid('mood-grid-full', false);
    renderMoodHistory();
    renderMoodChart('mood-chart');
    renderMoodInsight();
  } else if (name === 'routines') {
    renderRoutines('routines-full-list');
    renderRoutinePredictions();
    renderRoutineChart();
  } else if (name === 'food') {
    renderFoodSuggestions();
  } else if (name === 'chat') {
    initChat();
  } else if (name === 'profile') {
    renderProfile();
  } else if (name === 'settings') {
    renderSettings();
  }
}

// ============================================================
// UTILITY
// ============================================================
function setText(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
function flashCard(id) { const el = document.getElementById(id); if (el) { el.classList.remove('card-updated'); void el.offsetWidth; el.classList.add('card-updated'); } }

function updateDashboardHeader() {
  const p = getProfile();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  setText('dash-greeting', greeting);
  setText('dash-title', `Welcome back, ${p.fname}`);
  const dateEl = document.getElementById('dash-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ============================================================
// INIT
// ============================================================
function initDashboard() {
  updateDashboardHeader();
  initHydrationDrops('hydration-drops', getProfile().waterGoal);
  refreshHydration();
  refreshSleepDisplay();
  renderMoodGrid('mood-grid', true);
  const savedMood = Store.getToday('mood_label', null);
  if (savedMood) {
    const savedText = document.getElementById('mood-saved-text');
    const mood = MOODS.find(m => m.label === savedMood);
    if (savedText && mood) savedText.textContent = 'Mood saved: ' + mood.emoji + ' ' + savedMood;
  }
  renderHabitStreaks();
  renderRoutines('routines-today');
  generateAIRecs();
  updateWellnessDisplay();
  updateTicker();
  setInterval(updateTicker, 18000);

  // Sidebar nav
  document.querySelectorAll('.sidebar-nav a[data-section]').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); showSection(a.dataset.section); });
  });

  // Mobile sidebar
  const toggle = document.getElementById('sidebar-toggle');
  if (window.innerWidth < 768 && toggle) {
    toggle.style.display = 'flex';
    toggle.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
  }

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
  });

  // Scheduled notifications
  setTimeout(() => {
    const hydration = Store.getToday('hydration', 0);
    const p = getProfile();
    if (hydration < p.waterGoal / 2) notify('Hydration Reminder 💧', `You've had ${hydration} glasses. Drink more water to stay energized.`, 'fa-droplet');
  }, 5000);
}

document.addEventListener('DOMContentLoaded', initDashboard);
