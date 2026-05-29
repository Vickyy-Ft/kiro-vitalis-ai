const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'ai'], required: true },
  text: { type: String, required: true, maxlength: 2000 },
  moodDetected: { type: String },          // detected intent/mood
  recommendationType: { type: String },    // "hydration", "sleep", "stress", etc.
  timestamp: { type: Date, default: Date.now },
});

const chatHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
    // Aggregated emotional trends from this session
    emotionalTrends: {
      dominantMood: { type: String },
      stressCount: { type: Number, default: 0 },
      positiveCount: { type: Number, default: 0 },
    },
    sessionDate: {
      type: String, // YYYY-MM-DD
      index: true,
    },
  },
  { timestamps: true }
);

// One session per user per day
chatHistorySchema.index({ userId: 1, sessionDate: 1 }, { unique: true });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
