/**
 * VITALIS AI — Prediction Engine
 * Generates smart wellness predictions and reminders from historical data.
 */

/**
 * Predict next haircut date
 */
function predictHaircut(lastHaircutDate, intervalDays = 28) {
  if (!lastHaircutDate) return null;
  const last = new Date(lastHaircutDate);
  const next = new Date(last.getTime() + intervalDays * 86400000);
  const daysUntil = Math.round((next - Date.now()) / 86400000);
  return {
    nextDate: next.toISOString().split('T')[0],
    daysUntil,
    message:
      daysUntil <= 0
        ? `Your haircut is overdue by ${Math.abs(daysUntil)} days.`
        : daysUntil <= 5
        ? `Haircut due in ${daysUntil} days. Time to book!`
        : `Next haircut in ${daysUntil} days.`,
    urgent: daysUntil <= 3,
  };
}

/**
 * Predict next nail trim date
 */
function predictNailTrim(lastNailTrimDate, intervalDays = 10) {
  if (!lastNailTrimDate) return null;
  const last = new Date(lastNailTrimDate);
  const next = new Date(last.getTime() + intervalDays * 86400000);
  const daysUntil = Math.round((next - Date.now()) / 86400000);
  return {
    nextDate: next.toISOString().split('T')[0],
    daysUntil,
    message:
      daysUntil <= 0
        ? `Nail trim overdue by ${Math.abs(daysUntil)} days.`
        : `Next nail trim in ${daysUntil} days.`,
    urgent: daysUntil <= 1,
  };
}

/**
 * Detect burnout risk from last 7 days of wellness logs
 * @param {Array} logs - array of WellnessLog objects (last 7 days)
 */
function detectBurnoutRisk(logs) {
  if (!logs || logs.length < 3) return { risk: 'unknown', message: 'Not enough data for burnout analysis.' };

  const stressLevels = logs.map((l) => l.stressLevel).filter((s) => s != null);
  const sleepHours = logs.map((l) => l.sleep?.hours).filter((h) => h != null);
  const moodValues = logs.map((l) => l.mood?.value).filter((v) => v != null);

  const avgStress = stressLevels.length ? stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length : 5;
  const avgSleep = sleepHours.length ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length : 7;
  const avgMood = moodValues.length ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length : 3;

  let riskScore = 0;
  if (avgStress >= 7) riskScore += 3;
  else if (avgStress >= 5) riskScore += 1;
  if (avgSleep < 6) riskScore += 3;
  else if (avgSleep < 7) riskScore += 1;
  if (avgMood <= 2) riskScore += 3;
  else if (avgMood <= 3) riskScore += 1;

  const risk = riskScore >= 6 ? 'high' : riskScore >= 3 ? 'moderate' : 'low';
  const messages = {
    high: 'High burnout risk detected. Immediate rest and stress reduction are critical.',
    moderate: 'Moderate burnout indicators present. Consider reducing workload and prioritizing sleep.',
    low: 'Burnout risk is low. Keep maintaining your current wellness habits.',
  };

  return { risk, riskScore, avgStress: +avgStress.toFixed(1), avgSleep: +avgSleep.toFixed(1), avgMood: +avgMood.toFixed(1), message: messages[risk] };
}

/**
 * Detect sleep inconsistency from last 7 days
 */
function detectSleepInconsistency(logs) {
  const hours = logs.map((l) => l.sleep?.hours).filter((h) => h != null);
  if (hours.length < 3) return null;

  const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
  const variance = hours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hours.length;
  const stdDev = Math.sqrt(variance);
  const belowGoalCount = hours.filter((h) => h < 7).length;

  return {
    avg: +avg.toFixed(1),
    stdDev: +stdDev.toFixed(2),
    belowGoalCount,
    inconsistent: stdDev > 1.5,
    message:
      stdDev > 1.5
        ? `Sleep schedule is inconsistent (±${stdDev.toFixed(1)}h variation). A consistent bedtime improves sleep quality significantly.`
        : belowGoalCount >= 4
        ? `You slept below your goal ${belowGoalCount} of the last ${hours.length} days. Prioritize earlier bedtimes.`
        : 'Sleep schedule looks consistent. Keep it up!',
  };
}

/**
 * Detect hydration warning from last 7 days
 */
function detectHydrationWarning(logs, waterGoal = 8) {
  const glasses = logs.map((l) => l.hydration?.glasses).filter((g) => g != null);
  if (glasses.length === 0) return null;

  const avg = glasses.reduce((a, b) => a + b, 0) / glasses.length;
  const belowGoalCount = glasses.filter((g) => g < waterGoal).length;

  return {
    avg: +avg.toFixed(1),
    belowGoalCount,
    warning: avg < waterGoal * 0.7,
    message:
      avg < waterGoal * 0.5
        ? `Critical: Average hydration is only ${avg.toFixed(1)} glasses — well below your ${waterGoal} glass goal.`
        : avg < waterGoal * 0.7
        ? `Hydration has been below target for most of the week. Try setting hourly water reminders.`
        : `Hydration is on track. Average: ${avg.toFixed(1)}/${waterGoal} glasses.`,
  };
}

/**
 * Generate all predictions for a user
 */
function generateAllPredictions(routine, logs, goals = {}) {
  const predictions = [];

  if (routine?.personalCare?.lastHaircut) {
    const haircut = predictHaircut(routine.personalCare.lastHaircut, routine.personalCare.haircutIntervalDays);
    if (haircut) predictions.push({ type: 'haircut', ...haircut });
  }

  if (routine?.personalCare?.lastNailTrim) {
    const nails = predictNailTrim(routine.personalCare.lastNailTrim, routine.personalCare.nailTrimIntervalDays);
    if (nails) predictions.push({ type: 'nailTrim', ...nails });
  }

  if (logs && logs.length >= 3) {
    const burnout = detectBurnoutRisk(logs);
    predictions.push({ type: 'burnout', ...burnout });

    const sleep = detectSleepInconsistency(logs);
    if (sleep) predictions.push({ type: 'sleep', ...sleep });

    const hydration = detectHydrationWarning(logs, goals.waterGoal);
    if (hydration) predictions.push({ type: 'hydration', ...hydration });
  }

  return predictions;
}

module.exports = {
  predictHaircut,
  predictNailTrim,
  detectBurnoutRisk,
  detectSleepInconsistency,
  detectHydrationWarning,
  generateAllPredictions,
};
