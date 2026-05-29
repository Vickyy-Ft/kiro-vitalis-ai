const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned in queries by default
    },
    age: { type: Number, min: 13, max: 120 },
    gender: { type: String, enum: ['male', 'female', 'non-binary', 'prefer-not-to-say'] },
    profileImage: { type: String, default: '' },

    // Wellness goals
    wellnessGoals: {
      waterGoal: { type: Number, default: 8, min: 1, max: 20 },
      sleepGoal: { type: Number, default: 7.5, min: 4, max: 12 },
      moodBaseline: { type: String, default: 'Neutral' },
    },

    // Aggregated stats (updated on each check-in)
    stats: {
      wellnessScore: { type: Number, default: 0 },
      streakCount: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      totalDaysTracked: { type: Number, default: 0 },
      lastCheckinDate: { type: Date },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Return safe user object (no password)
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
