const User = require('../models/User');
const WellnessLog = require('../models/WellnessLog');
const Routine = require('../models/Routine');
const { calculateStreak } = require('../utils/wellnessCalculator');
const { generateNotifications } = require('../utils/notificationEngine');
const { generateAllPredictions } = require('../utils/predictionEngine');

// ─── GET /api/user/dashboard ──────────────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];

    // Fetch today's log
    const todayLog = await WellnessLog.findOne({ userId, date: today }).lean();

    // Fetch last 7 days of logs
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const recentLogs = await WellnessLog.find({
      userId,
      date: { $gte: sevenDaysAgo },
    })
      .sort({ date: -1 })
      .lean();

    // Fetch routine config
    const routine = await Routine.findOne({ userId }).lean();

    // Calculate streak
    const allDates = await WellnessLog.distinct('date', { userId });
    const streak = calculateStreak(allDates);

    // Update user streak in DB if changed
    if (streak !== req.user.stats?.streakCount) {
      await User.findByIdAndUpdate(userId, {
        'stats.streakCount': streak,
        'stats.longestStreak': Math.max(streak, req.user.stats?.longestStreak || 0),
        'stats.totalDaysTracked': allDates.length,
      });
    }

    // Generate notifications
    const notifications = generateNotifications(todayLog, req.user, recentLogs);

    // Generate predictions
    const predictions = generateAllPredictions(routine, recentLogs, req.user.wellnessGoals);

    // Build 7-day chart data
    const chartData = buildChartData(recentLogs);

    res.status(200).json({
      success: true,
      data: {
        user: req.user.toSafeObject ? req.user.toSafeObject() : req.user,
        todayLog,
        recentLogs,
        routine,
        streak,
        notifications,
        predictions,
        chartData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/user/update-profile ─────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { username, age, gender, wellnessGoals } = req.body;
    const updates = {};

    if (username) updates.username = username;
    if (age) updates.age = age;
    if (gender) updates.gender = gender;
    if (wellnessGoals) {
      if (wellnessGoals.waterGoal) updates['wellnessGoals.waterGoal'] = wellnessGoals.waterGoal;
      if (wellnessGoals.sleepGoal) updates['wellnessGoals.sleepGoal'] = wellnessGoals.sleepGoal;
      if (wellnessGoals.moodBaseline) updates['wellnessGoals.moodBaseline'] = wellnessGoals.moodBaseline;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

/** Build chart-ready data from recent logs */
function buildChartData(logs) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const log = logs.find((l) => l.date === dateStr);
    days.push({
      date: dateStr,
      label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      sleep: log?.sleep?.hours ?? null,
      hydration: log?.hydration?.glasses ?? null,
      mood: log?.mood?.value ?? null,
      wellnessScore: log?.wellnessScore ?? null,
      stressLevel: log?.stressLevel ?? null,
    });
  }
  return days;
}

module.exports = { getDashboard, updateProfile };
