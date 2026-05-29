/**
 * VITALIS AI — Notification Engine
 * Generates contextual wellness notifications based on user data.
 */

/**
 * Generate all active notifications for a user
 * @param {Object} todayLog - today's WellnessLog
 * @param {Object} user - User document
 * @param {Array} recentLogs - last 7 days of logs
 * @returns {Array} notifications
 */
function generateNotifications(todayLog, user, recentLogs = []) {
  const notifications = [];
  const goals = user.wellnessGoals || {};
  const waterGoal = goals.waterGoal || 8;
  const sleepGoal = goals.sleepGoal || 7.5;
  const now = new Date();
  const hour = now.getHours();

  // Hydration alerts
  if (todayLog) {
    const glasses = todayLog.hydration?.glasses || 0;
    const pct = (glasses / waterGoal) * 100;
    if (hour >= 14 && pct < 50) {
      notifications.push({
        type: 'hydration',
        priority: 'high',
        title: 'Hydration Alert 💧',
        message: `You've only had ${glasses} glasses today. Drink ${waterGoal - glasses} more to reach your goal.`,
        icon: 'fa-droplet',
      });
    }
    if (hour >= 20 && pct < 75) {
      notifications.push({
        type: 'hydration',
        priority: 'medium',
        title: 'Evening Hydration Reminder',
        message: `End the day strong — ${waterGoal - glasses} more glasses to hit your hydration goal.`,
        icon: 'fa-droplet',
      });
    }
  }

  // Sleep reminders
  if (hour >= 21) {
    const lastSleep = todayLog?.sleep?.hours;
    if (!lastSleep) {
      notifications.push({
        type: 'sleep',
        priority: 'medium',
        title: 'Sleep Reminder 🌙',
        message: `It's getting late. Aim to sleep by ${formatTime(sleepGoal)} for optimal recovery.`,
        icon: 'fa-moon',
      });
    }
  }

  // Streak achievements
  const streak = user.stats?.streakCount || 0;
  if (streak > 0 && streak % 7 === 0) {
    notifications.push({
      type: 'achievement',
      priority: 'low',
      title: `${streak}-Day Streak! 🔥`,
      message: `Incredible consistency! You've tracked your wellness for ${streak} days in a row.`,
      icon: 'fa-fire',
    });
  }

  // Wellness score achievements
  if (todayLog?.wellnessScore >= 90) {
    notifications.push({
      type: 'achievement',
      priority: 'low',
      title: 'Peak Wellness Day! ⭐',
      message: `Your wellness score is ${todayLog.wellnessScore}/100 today. Outstanding performance!`,
      icon: 'fa-star',
    });
  }

  // Burnout warning from recent logs
  if (recentLogs.length >= 3) {
    const highStressDays = recentLogs.filter((l) => l.stressLevel >= 7).length;
    if (highStressDays >= 3) {
      notifications.push({
        type: 'warning',
        priority: 'high',
        title: 'Burnout Risk Detected ⚠️',
        message: `High stress detected for ${highStressDays} days this week. Consider reducing workload and prioritizing rest.`,
        icon: 'fa-triangle-exclamation',
      });
    }
  }

  // Morning mood check-in reminder
  if (hour >= 9 && hour <= 11 && !todayLog?.mood?.label) {
    notifications.push({
      type: 'reminder',
      priority: 'low',
      title: 'Morning Check-in',
      message: 'How are you feeling today? Log your mood to get personalized AI insights.',
      icon: 'fa-face-smile',
    });
  }

  return notifications.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

function formatTime(sleepGoalHours) {
  const bedHour = 24 - (sleepGoalHours - 6);
  const h = bedHour % 24;
  return `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
}

module.exports = { generateNotifications };
