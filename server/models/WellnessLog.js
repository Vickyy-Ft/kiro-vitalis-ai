const mongoose = require('mongoose');

const wellnessLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD for easy daily keying
      required: true,
      index: true,
    },

    // Sleep
    sleep: {
      hours: { type: Number, min: 0, max: 24 },
      bedtime: { type: String },   // "22:30"
      wakeTime: { type: String },  // "06:30"
      quality: { type: Number, min: 1, max: 5 }, // 1=very poor, 5=excellent
    },

    // Hydration
    hydration: {
      glasses: { type: Number, default: 0, min: 0, max: 30 },
      goal: { type: Number, default: 8 },
    },

    // Mood & emotional state
    mood: {
      label: { type: String },   // "Stressed", "Happy", etc.
      value: { type: Number, min: 1, max: 5 },
      note: { type: String, maxlength: 500 },
    },

    // Stress & energy (1–10 scale)
    stressLevel: { type: Number, min: 1, max: 10 },
    energyLevel: { type: Number, min: 1, max: 10 },

    // Routines completed (array of routine IDs)
    completedRoutines: [{ type: String }],

    // Daily notes
    notes: { type: String, maxlength: 1000 },

    // Computed wellness score for this day
    wellnessScore: { type: Number, min: 0, max: 100 },

    // AI-generated insight for this day
    aiInsight: { type: String },
  },
  { timestamps: true }
);

// Compound index: one log per user per day
wellnessLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WellnessLog', wellnessLogSchema);
