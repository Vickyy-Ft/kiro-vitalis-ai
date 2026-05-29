/**
 * VITALIS AI — Frontend API Client
 * Connects the frontend to the Node.js/Express backend.
 * Drop this file in the root alongside index.html.
 */

// Detect if running on localhost (dev server) or deployed (same origin)
const isLocalDev = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.port === '5500';
const API_BASE = isLocalDev ? 'http://localhost:5000/api' : '/api';

// ─── Token Management ─────────────────────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem('vitalis_token'),
  setToken: (token) => localStorage.setItem('vitalis_token', token),
  removeToken: () => localStorage.removeItem('vitalis_token'),
  isLoggedIn: () => !!localStorage.getItem('vitalis_token'),
};

// ─── Base Fetch Wrapper ───────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      // Token expired — clear and redirect to login
      if (res.status === 401) {
        Auth.removeToken();
        if (!window.location.pathname.includes('login')) {
          window.location.href = 'login.html';
        }
      }
      throw new Error(data.message || `API error ${res.status}`);
    }
    return data;
  } catch (error) {
    console.error(`[Vitalis API] ${endpoint}:`, error.message);
    throw error;
  }
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
const VitalisAuth = {
  async signup(payload) {
    const data = await apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
    if (data.token) { Auth.setToken(data.token); VitalisStore.setUser(data.user); }
    return data;
  },

  async login(email, password) {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (data.token) { Auth.setToken(data.token); VitalisStore.setUser(data.user); }
    return data;
  },

  async getProfile() {
    return apiFetch('/auth/profile');
  },

  logout() {
    Auth.removeToken();
    localStorage.removeItem('vitalis_user');
    window.location.href = 'login.html';
  },
};

// ─── User API ─────────────────────────────────────────────────────────────────
const VitalisUser = {
  async getDashboard() {
    return apiFetch('/user/dashboard');
  },

  async updateProfile(payload) {
    return apiFetch('/user/update-profile', { method: 'PUT', body: JSON.stringify(payload) });
  },
};

// ─── Wellness API ─────────────────────────────────────────────────────────────
const VitalisWellness = {
  /**
   * Submit a wellness check-in
   * @param {Object} payload - { sleep, hydration, mood, stressLevel, energyLevel, completedRoutines, notes }
   */
  async checkIn(payload) {
    return apiFetch('/wellness/checkin', { method: 'POST', body: JSON.stringify(payload) });
  },

  async getHistory(days = 30) {
    return apiFetch(`/wellness/history?days=${days}`);
  },

  async updateLog(payload, date = null) {
    const query = date ? `?date=${date}` : '';
    return apiFetch(`/wellness/update${query}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
};

// ─── AI Chat API ──────────────────────────────────────────────────────────────
const VitalisAI = {
  async chat(message) {
    return apiFetch('/ai/chat', { method: 'POST', body: JSON.stringify({ message }) });
  },

  async getChatHistory(days = 7) {
    return apiFetch(`/ai/history?days=${days}`);
  },
};

// ─── Analytics API ────────────────────────────────────────────────────────────
const VitalisAnalytics = {
  async getMood(days = 30) { return apiFetch(`/analytics/mood?days=${days}`); },
  async getSleep(days = 30) { return apiFetch(`/analytics/sleep?days=${days}`); },
  async getHydration(days = 30) { return apiFetch(`/analytics/hydration?days=${days}`); },
  async getWellnessScore(days = 30) { return apiFetch(`/analytics/wellness-score?days=${days}`); },

  /** Fetch all analytics in parallel */
  async getAll(days = 30) {
    const [mood, sleep, hydration, wellness] = await Promise.all([
      this.getMood(days),
      this.getSleep(days),
      this.getHydration(days),
      this.getWellnessScore(days),
    ]);
    return { mood, sleep, hydration, wellness };
  },
};

// ─── Local User Store ─────────────────────────────────────────────────────────
const VitalisStore = {
  setUser: (user) => localStorage.setItem('vitalis_user', JSON.stringify(user)),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('vitalis_user')); } catch { return null; }
  },
};

// ─── Dashboard Integration Helper ────────────────────────────────────────────
/**
 * Sync backend dashboard data into the frontend localStorage-based system.
 * Call this on dashboard load when the user is authenticated.
 */
async function syncDashboardFromBackend() {
  if (!Auth.isLoggedIn()) return;
  try {
    const { data } = await VitalisUser.getDashboard();
    const { todayLog, user, streak, notifications, predictions, chartData } = data;

    // Sync user profile
    if (user) {
      VitalisStore.setUser(user);
      const p = user.wellnessGoals || {};
      const profile = {
        fname: user.username?.split(' ')[0] || user.username,
        lname: user.username?.split(' ')[1] || '',
        email: user.email,
        waterGoal: p.waterGoal || 8,
        sleepGoal: p.sleepGoal || 7.5,
      };
      localStorage.setItem('vitalis_profile', JSON.stringify(profile));
    }

    // Sync today's log into localStorage
    if (todayLog) {
      const today = new Date().toISOString().split('T')[0];
      if (todayLog.hydration?.glasses != null) {
        const h = JSON.parse(localStorage.getItem('vitalis_hydration') || '{}');
        h[today] = todayLog.hydration.glasses;
        localStorage.setItem('vitalis_hydration', JSON.stringify(h));
      }
      if (todayLog.sleep?.hours != null) {
        const s = JSON.parse(localStorage.getItem('vitalis_sleep_hours') || '{}');
        s[today] = todayLog.sleep.hours;
        localStorage.setItem('vitalis_sleep_hours', JSON.stringify(s));
      }
      if (todayLog.mood?.label) {
        const m = JSON.parse(localStorage.getItem('vitalis_mood_label') || '{}');
        m[today] = todayLog.mood.label;
        localStorage.setItem('vitalis_mood_label', JSON.stringify(m));
        const mv = JSON.parse(localStorage.getItem('vitalis_mood_value') || '{}');
        mv[today] = todayLog.mood.value;
        localStorage.setItem('vitalis_mood_value', JSON.stringify(mv));
      }
      if (todayLog.completedRoutines) {
        const r = JSON.parse(localStorage.getItem('vitalis_routines_done') || '{}');
        r[today] = todayLog.completedRoutines;
        localStorage.setItem('vitalis_routines_done', JSON.stringify(r));
      }
    }

    // Sync chart history
    if (chartData) {
      const sleepH = {}, hydH = {}, moodH = {}, wellH = {};
      chartData.forEach((d) => {
        if (d.sleep != null) sleepH[d.date] = d.sleep;
        if (d.hydration != null) hydH[d.date] = d.hydration;
        if (d.mood != null) moodH[d.date] = d.mood;
        if (d.wellnessScore != null) wellH[d.date] = d.wellnessScore;
      });
      localStorage.setItem('vitalis_sleep_hours', JSON.stringify({ ...JSON.parse(localStorage.getItem('vitalis_sleep_hours') || '{}'), ...sleepH }));
      localStorage.setItem('vitalis_hydration', JSON.stringify({ ...JSON.parse(localStorage.getItem('vitalis_hydration') || '{}'), ...hydH }));
      localStorage.setItem('vitalis_mood_value', JSON.stringify({ ...JSON.parse(localStorage.getItem('vitalis_mood_value') || '{}'), ...moodH }));
      localStorage.setItem('vitalis_wellness_history', JSON.stringify({ ...JSON.parse(localStorage.getItem('vitalis_wellness_history') || '{}'), ...wellH }));
    }

    console.log('[Vitalis] Dashboard synced from backend ✅');
    return data;
  } catch (error) {
    console.warn('[Vitalis] Backend sync failed, using local data:', error.message);
    return null;
  }
}

/**
 * Auto-save wellness check-in to backend when data changes.
 * Call this after any hydration/sleep/mood update in dashboard.js.
 */
async function autoSaveToBackend() {
  if (!Auth.isLoggedIn()) return;
  try {
    const today = new Date().toISOString().split('T')[0];
    const getDay = (key, fallback) => {
      try { const all = JSON.parse(localStorage.getItem('vitalis_' + key) || '{}'); return all[today] !== undefined ? all[today] : fallback; } catch { return fallback; }
    };

    const payload = {
      hydration: { glasses: getDay('hydration', 0) },
      mood: { label: getDay('mood_label', null), value: getDay('mood_value', null) },
      completedRoutines: getDay('routines_done', []),
    };

    const sleepHours = getDay('sleep_hours', null);
    if (sleepHours !== null) {
      payload.sleep = {
        hours: sleepHours,
        bedtime: getDay('sleep_bedtime', null),
        wakeTime: getDay('sleep_waketime', null),
        quality: getDay('sleep_quality', 3),
      };
    }

    await VitalisWellness.checkIn(payload);
  } catch (error) {
    // Silent fail — local data is the source of truth
  }
}

// Export for use in dashboard.js and auth pages
window.VitalisAuth = VitalisAuth;
window.VitalisUser = VitalisUser;
window.VitalisWellness = VitalisWellness;
window.VitalisAI = VitalisAI;
window.VitalisAnalytics = VitalisAnalytics;
window.VitalisStore = VitalisStore;
window.syncDashboardFromBackend = syncDashboardFromBackend;
window.autoSaveToBackend = autoSaveToBackend;
window.Auth = Auth;
