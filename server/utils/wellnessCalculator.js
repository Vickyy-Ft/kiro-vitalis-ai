/**
 * VITALIS AI — Wellness Score Calculator
 * Computes a 0–100 wellness score from daily log data.
 */

const WEIGHTS = {
  sleep: 0.35,
  hydration: 0.25,
  mood: 0.20,
  stress: 0.10,
  energy: 0.05,
  routine: 0.05,
};

/**
 * Calculate sleep score (0–100)
 * @param {number} hours - actual sleep hours
 * @param {number} goal  - target sleep hours
 * @param {number} quality - 1–5 quality rating
 */
function calcSleepScore(hours, goal, quality = 3) {
  if (hours == null) return 0;
  const ratio = hours / goal;
  let base;
  if (ratio >= 1.0) base = 100;
  else if (ratio >= 0.9) base = 90;
  else if (ratio >= 0.75) base = 75;
  else if (ratio >= 0.6) base = 55;
  else base = 30;
  // Quality modifier: ±10 points
  const qualityBonus = (quality - 3) * 5; // -10 to +10
  return Math.min(100, Math.max(0, base + qualityBonus));
}

/**
 * Calculate hydration score (0–100)
 */
function calcHydrationScore(glasses, goal) {
  if (glasses == null || goal == null) return 0;
  return Math.min(100, Math.round((glasses / goal) * 100));
}

/**
 * Calculate mood score (0–100)
 * mood value is 1–5
 */
function calcMoodScore(moodValue) {
  if (moodValue == null) return 0;
  return Math.round((moodValue / 5) * 100);
}

/**
 * Calculate stress score (0–100) — lower stress = higher score
 * stressLevel is 1–10
 */
function calcStressScore(stressLevel) {
  if (stressLevel == null) return 50; // neutral if not logged
  return Math.round(((10 - stressLevel) / 9) * 100);
}

/**
 * Calculate energy score (0–100)
 * energyLevel is 1–10
 */
function calcEnergyScore(energyLevel) {
  if (energyLevel == null) return 50;
  return Math.round((energyLevel / 10) * 100);
}

/**
 * Calculate routine score (0–100)
 */
function calcRoutineScore(completedCount, totalCount = 8) {
  if (!completedCount || totalCount === 0) return 0;
  return Math.round((completedCount / totalCount) * 100);
}

/**
 * Main wellness score calculator
 * @param {Object} log - WellnessLog document or plain object
 * @param {Object} goals - { sleepGoal, waterGoal }
 * @returns {Object} { score, breakdown }
 */
function calculateWellnessScore(log, goals = {}) {
  const sleepGoal = goals.sleepGoal || 7.5;
  const waterGoal = goals.waterGoal || 8;
  const totalRoutines = 8;

  const sleepScore = calcSleepScore(
    log.sleep?.hours,
    sleepGoal,
    log.sleep?.quality
  );
  const hydrationScore = calcHydrationScore(
    log.hydration?.glasses,
    waterGoal
  );
  const moodScore = calcMoodScore(log.mood?.value);
  const stressScore = calcStressScore(log.stressLevel);
  const energyScore = calcEnergyScore(log.energyLevel);
  const routineScore = calcRoutineScore(
    log.completedRoutines?.length,
    totalRoutines
  );

  const score = Math.round(
    sleepScore * WEIGHTS.sleep +
    hydrationScore * WEIGHTS.hydration +
    moodScore * WEIGHTS.mood +
    stressScore * WEIGHTS.stress +
    energyScore * WEIGHTS.energy +
    routineScore * WEIGHTS.routine
  );

  const label =
    score >= 85 ? 'Excellent' :
    score >= 70 ? 'Good' :
    score >= 55 ? 'Fair' :
    score >= 40 ? 'Needs Improvement' : 'Critical';

  return {
    score,
    label,
    breakdown: {
      sleep: sleepScore,
      hydration: hydrationScore,
      mood: moodScore,
      stress: stressScore,
      energy: energyScore,
      routine: routineScore,
    },
  };
}

/**
 * Calculate streak from an array of sorted date strings (YYYY-MM-DD)
 */
function calculateStreak(dates) {
  if (!dates || dates.length === 0) return 0;
  const sorted = [...dates].sort((a, b) => b.localeCompare(a)); // newest first
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Streak must include today or yesterday to be active
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round((prev - curr) / 86400000);
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}

/**
 * Generate weekly trend summary from array of 7 scores
 */
function generateWeeklyTrend(scores) {
  const valid = scores.filter((s) => s != null && s > 0);
  if (valid.length === 0) return { avg: 0, trend: 'no data', change: 0 };
  const avg = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  const firstHalf = valid.slice(0, Math.floor(valid.length / 2));
  const secondHalf = valid.slice(Math.floor(valid.length / 2));
  const firstAvg = firstHalf.length ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : avg;
  const secondAvg = secondHalf.length ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : avg;
  const change = Math.round(secondAvg - firstAvg);
  const trend = change > 3 ? 'improving' : change < -3 ? 'declining' : 'stable';
  return { avg, trend, change };
}

module.exports = {
  calculateWellnessScore,
  calculateStreak,
  generateWeeklyTrend,
  calcSleepScore,
  calcHydrationScore,
  calcMoodScore,
};
