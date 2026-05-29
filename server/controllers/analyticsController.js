const WellnessLog = require('../models/WellnessLog');
const { generateWeeklyTrend } = require('../utils/wellnessCalculator');
const { detectBurnoutRisk, detectSleepInconsistency, detectHydrationWarning } = require('../utils/predictionEngine');

/** Helper: get logs for last N days */
async function getRecentLogs(userId, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  return WellnessLog.find({ userId, date: { $gte: since } }).sort({ date: 1 }).lean();
}

/** Helper: build date-keyed map from logs */
function buildDateMap(logs, extractor) {
  return logs.map((l) => ({ date: l.date, value: extractor(l) }));
}

// ─── GET /api/analytics/mood ──────────────────────────────────────────────────
const getMoodAnalytics = async (req, res, next) => {
  try {
    const logs = await getRecentLogs(req.user._id, parseInt(req.query.days) || 30);
    const series = buildDateMap(logs, (l) => ({ value: l.mood?.value ?? null, label: l.mood?.label ?? null }));

    // Mood distribution
    const distribution = {};
    logs.forEach((l) => {
      if (l.mood?.label) distribution[l.mood.label] = (distribution[l.mood.label] || 0) + 1;
    });

    // Dominant mood
    const dominant = Object.entries(distribution).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Weekly trend
    const last7Values = logs.slice(-7).map((l) => l.mood?.value ?? null);
    const trend = generateWeeklyTrend(last7Values);

    // Emotional analysis
    const negativeCount = logs.filter((l) => ['Stressed', 'Sad', 'Anxious', 'Angry'].includes(l.mood?.label)).length;
    const positiveCount = logs.filter((l) => ['Happy', 'Focused', 'Energized', 'Calm'].includes(l.mood?.label)).length;

    res.status(200).json({
      success: true,
      data: { series, distribution, dominant, trend, negativeCount, positiveCount, totalLogs: logs.length },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/analytics/sleep ─────────────────────────────────────────────────
const getSleepAnalytics = async (req, res, next) => {
  try {
    const logs = await getRecentLogs(req.user._id, parseInt(req.query.days) || 30);
    const series = buildDateMap(logs, (l) => ({ hours: l.sleep?.hours ?? null, quality: l.sleep?.quality ?? null }));

    const sleepHours = logs.map((l) => l.sleep?.hours).filter((h) => h != null);
    const avg = sleepHours.length ? +(sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length).toFixed(1) : null;
    const max = sleepHours.length ? Math.max(...sleepHours) : null;
    const min = sleepHours.length ? Math.min(...sleepHours) : null;

    const sleepGoal = req.user.wellnessGoals?.sleepGoal || 7.5;
    const goalMetCount = sleepHours.filter((h) => h >= sleepGoal).length;

    const inconsistency = detectSleepInconsistency(logs);
    const last7Values = logs.slice(-7).map((l) => l.sleep?.hours ?? null);
    const trend = generateWeeklyTrend(last7Values);

    res.status(200).json({
      success: true,
      data: { series, avg, max, min, goalMetCount, totalLogs: logs.length, inconsistency, trend, sleepGoal },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/analytics/hydration ────────────────────────────────────────────
const getHydrationAnalytics = async (req, res, next) => {
  try {
    const logs = await getRecentLogs(req.user._id, parseInt(req.query.days) || 30);
    const series = buildDateMap(logs, (l) => l.hydration?.glasses ?? null);

    const glasses = logs.map((l) => l.hydration?.glasses).filter((g) => g != null);
    const avg = glasses.length ? +(glasses.reduce((a, b) => a + b, 0) / glasses.length).toFixed(1) : null;
    const waterGoal = req.user.wellnessGoals?.waterGoal || 8;
    const goalMetCount = glasses.filter((g) => g >= waterGoal).length;

    const warning = detectHydrationWarning(logs, waterGoal);
    const last7Values = logs.slice(-7).map((l) => l.hydration?.glasses ?? null);
    const trend = generateWeeklyTrend(last7Values);

    res.status(200).json({
      success: true,
      data: { series, avg, goalMetCount, totalLogs: logs.length, warning, trend, waterGoal },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/analytics/wellness-score ───────────────────────────────────────
const getWellnessScoreAnalytics = async (req, res, next) => {
  try {
    const logs = await getRecentLogs(req.user._id, parseInt(req.query.days) || 30);
    const series = buildDateMap(logs, (l) => l.wellnessScore ?? null);

    const scores = logs.map((l) => l.wellnessScore).filter((s) => s != null);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const max = scores.length ? Math.max(...scores) : null;
    const min = scores.length ? Math.min(...scores) : null;

    const last7Values = logs.slice(-7).map((l) => l.wellnessScore ?? null);
    const trend = generateWeeklyTrend(last7Values);

    const burnout = detectBurnoutRisk(logs.slice(-7));

    // Score distribution buckets
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
    scores.forEach((s) => {
      if (s >= 85) distribution.excellent++;
      else if (s >= 70) distribution.good++;
      else if (s >= 55) distribution.fair++;
      else distribution.poor++;
    });

    res.status(200).json({
      success: true,
      data: { series, avg, max, min, trend, burnout, distribution, totalLogs: logs.length },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMoodAnalytics, getSleepAnalytics, getHydrationAnalytics, getWellnessScoreAnalytics };
