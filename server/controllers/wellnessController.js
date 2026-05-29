const WellnessLog = require('../models/WellnessLog');
const User = require('../models/User');
const { calculateWellnessScore, calculateStreak } = require('../utils/wellnessCalculator');
const { generateDailyInsight } = require('../utils/aiResponseEngine');

// ─── POST /api/wellness/checkin ───────────────────────────────────────────────
const checkIn = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];
    const goals = req.user.wellnessGoals || {};

    const {
      sleep,       // { hours, bedtime, wakeTime, quality }
      hydration,   // { glasses }
      mood,        // { label, value, note }
      stressLevel,
      energyLevel,
      completedRoutines,
      notes,
    } = req.body;

    // Build update object
    const logData = { userId, date: today };
    if (sleep) logData.sleep = sleep;
    if (hydration) logData.hydration = { ...hydration, goal: goals.waterGoal || 8 };
    if (mood) logData.mood = mood;
    if (stressLevel != null) logData.stressLevel = stressLevel;
    if (energyLevel != null) logData.energyLevel = energyLevel;
    if (completedRoutines) logData.completedRoutines = completedRoutines;
    if (notes) logData.notes = notes;

    // Upsert today's log
    let log = await WellnessLog.findOneAndUpdate(
      { userId, date: today },
      { $set: logData },
      { new: true, upsert: true, runValidators: true }
    );

    // Calculate wellness score
    const { score, label, breakdown } = calculateWellnessScore(log, goals);
    log.wellnessScore = score;
    log.aiInsight = generateDailyInsight(log, goals);
    await log.save();

    // Update user stats
    const allDates = await WellnessLog.distinct('date', { userId });
    const streak = calculateStreak(allDates);
    await User.findByIdAndUpdate(userId, {
      'stats.wellnessScore': score,
      'stats.streakCount': streak,
      'stats.longestStreak': Math.max(streak, req.user.stats?.longestStreak || 0),
      'stats.totalDaysTracked': allDates.length,
      'stats.lastCheckinDate': new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Check-in saved successfully.',
      data: { log, score, label, breakdown, streak },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/wellness/history ────────────────────────────────────────────────
const getHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { days = 30, page = 1, limit = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 86400000).toISOString().split('T')[0];

    const logs = await WellnessLog.find({ userId, date: { $gte: since } })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await WellnessLog.countDocuments({ userId, date: { $gte: since } });

    res.status(200).json({
      success: true,
      data: { logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/wellness/update ─────────────────────────────────────────────────
const updateLog = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const log = await WellnessLog.findOneAndUpdate(
      { userId, date: targetDate },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!log) {
      return res.status(404).json({ success: false, message: 'No log found for this date.' });
    }

    // Recalculate score
    const goals = req.user.wellnessGoals || {};
    const { score, label, breakdown } = calculateWellnessScore(log, goals);
    log.wellnessScore = score;
    log.aiInsight = generateDailyInsight(log, goals);
    await log.save();

    res.status(200).json({ success: true, data: { log, score, label, breakdown } });
  } catch (error) {
    next(error);
  }
};

module.exports = { checkIn, getHistory, updateLog };
