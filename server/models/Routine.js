const mongoose = require('mongoose');

const routineSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Personal care tracking (date-based predictions)
    personalCare: {
      lastHaircut: { type: Date },
      haircutIntervalDays: { type: Number, default: 28 },
      lastNailTrim: { type: Date },
      nailTrimIntervalDays: { type: Number, default: 10 },
      lastSkincare: { type: Date },
      skincareFrequency: { type: String, enum: ['daily', 'weekly', 'bi-weekly'], default: 'daily' },
    },

    // Daily routine schedule
    dailyRoutines: [
      {
        id: { type: String, required: true },
        time: { type: String },       // "07:00 AM"
        name: { type: String, required: true },
        description: { type: String },
        isAIPick: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
      },
    ],

    // Workout routine
    workout: {
      frequency: { type: String, enum: ['daily', '3x/week', '5x/week', 'weekends', 'none'], default: 'none' },
      preferredTime: { type: String },
      lastWorkout: { type: Date },
    },

    // Meditation / mindfulness
    meditation: {
      frequency: { type: String, enum: ['daily', 'weekly', 'occasionally', 'none'], default: 'none' },
      durationMinutes: { type: Number, default: 5 },
      lastSession: { type: Date },
    },

    // Reminder settings
    reminders: {
      hydrationAlerts: { type: Boolean, default: true },
      sleepReminder: { type: Boolean, default: true },
      sleepReminderTime: { type: String, default: '22:00' },
      moodCheckIn: { type: Boolean, default: true },
      moodCheckInTime: { type: String, default: '09:00' },
      dailyInsights: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// One routine config per user
routineSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Routine', routineSchema);
