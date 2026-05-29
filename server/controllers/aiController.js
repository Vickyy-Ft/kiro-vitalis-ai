const ChatHistory = require('../models/ChatHistory');
const WellnessLog = require('../models/WellnessLog');
const { generateResponse, detectMoodFromMessage } = require('../utils/aiResponseEngine');
const { calculateWellnessScore } = require('../utils/wellnessCalculator');

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────
const chat = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const goals = req.user.wellnessGoals || {};

    // Fetch today's wellness log for context
    const todayLog = await WellnessLog.findOne({ userId, date: today }).lean();

    // Build AI context from real user data
    let wsBreakdown = {};
    let wsScore = null;
    if (todayLog) {
      const ws = calculateWellnessScore(todayLog, goals);
      wsScore = ws.score;
      wsBreakdown = ws.breakdown;
    }

    const context = {
      sleep: todayLog?.sleep?.hours ?? null,
      sleepGoal: goals.sleepGoal || 7.5,
      hydration: todayLog?.hydration?.glasses ?? 0,
      waterGoal: goals.waterGoal || 8,
      mood: todayLog?.mood?.label ?? null,
      score: wsScore,
      breakdown: wsBreakdown,
    };

    // Generate AI response
    const { text: aiText, intent, recommendationType } = generateResponse(message, context);
    const moodDetected = detectMoodFromMessage(message);

    // Upsert today's chat session
    const userMsg = {
      role: 'user',
      text: message.trim(),
      moodDetected,
      recommendationType: intent,
      timestamp: new Date(),
    };
    const aiMsg = {
      role: 'ai',
      text: aiText,
      moodDetected,
      recommendationType,
      timestamp: new Date(),
    };

    let session = await ChatHistory.findOne({ userId, sessionDate: today });
    if (session) {
      session.messages.push(userMsg, aiMsg);
      // Keep last 100 messages per session
      if (session.messages.length > 100) session.messages = session.messages.slice(-100);
      // Update emotional trends
      if (moodDetected) {
        const negative = ['Stressed', 'Sad', 'Angry', 'Tired'];
        if (negative.includes(moodDetected)) session.emotionalTrends.stressCount += 1;
        else session.emotionalTrends.positiveCount += 1;
      }
      await session.save();
    } else {
      session = await ChatHistory.create({
        userId,
        sessionDate: today,
        messages: [userMsg, aiMsg],
        emotionalTrends: {
          dominantMood: moodDetected || 'Neutral',
          stressCount: moodDetected && ['Stressed', 'Sad', 'Angry', 'Tired'].includes(moodDetected) ? 1 : 0,
          positiveCount: moodDetected && ['Happy', 'Focused', 'Energized', 'Calm'].includes(moodDetected) ? 1 : 0,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        message: aiText,
        intent,
        recommendationType,
        moodDetected,
        context,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/ai/history ──────────────────────────────────────────────────────
const getChatHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { date, days = 7 } = req.query;

    let query = { userId };
    if (date) {
      query.sessionDate = date;
    } else {
      const since = new Date(Date.now() - parseInt(days) * 86400000).toISOString().split('T')[0];
      query.sessionDate = { $gte: since };
    }

    const sessions = await ChatHistory.find(query)
      .sort({ sessionDate: -1 })
      .lean();

    // Flatten messages for easy frontend consumption
    const allMessages = sessions.flatMap((s) =>
      s.messages.map((m) => ({ ...m, sessionDate: s.sessionDate }))
    );

    res.status(200).json({
      success: true,
      data: { sessions, allMessages, totalSessions: sessions.length },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { chat, getChatHistory };
