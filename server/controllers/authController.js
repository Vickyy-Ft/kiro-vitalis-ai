const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Routine = require('../models/Routine');

/** Simple inline validator */
function validate(fields) {
  const errors = [];
  if (fields.username !== undefined && (typeof fields.username !== 'string' || fields.username.trim().length < 3))
    errors.push('Username must be at least 3 characters.');
  if (fields.email !== undefined && !/^\S+@\S+\.\S+$/.test(fields.email))
    errors.push('Please provide a valid email.');
  if (fields.password !== undefined) {
    if (fields.password.length < 8) errors.push('Password must be at least 8 characters.');
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(fields.password))
      errors.push('Password must contain uppercase, lowercase, and a number.');
  }
  return errors;
}

/** Generate signed JWT */
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/** Send token response */
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: user.toSafeObject(),
  });
};

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
const signup = async (req, res, next) => {
  try {
    const { username, email, password, age, gender } = req.body;
    const errors = validate({ username, email, password });
    if (errors.length) return res.status(400).json({ success: false, message: errors[0] });

    // Check duplicates
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'Email' : 'Username';
      return res.status(409).json({ success: false, message: `${field} already in use.` });
    }

    const user = await User.create({ username, email, password, age, gender });

    // Create default routine config for new user
    await Routine.create({
      userId: user._id,
      dailyRoutines: [
        { id: 'r1', time: '07:00 AM', name: 'Morning Breathing', description: '5 min · Stress relief', isAIPick: true },
        { id: 'r2', time: '07:30 AM', name: 'Hydration Start', description: '2 glasses · Morning', isAIPick: false },
        { id: 'r3', time: '08:00 AM', name: 'Healthy Breakfast', description: 'Nutrient-rich · AI pick', isAIPick: true },
        { id: 'r4', time: '12:00 PM', name: 'Mindful Lunch', description: 'Iron-rich foods · AI pick', isAIPick: true },
        { id: 'r5', time: '02:00 PM', name: 'Hydration Check', description: '2 glasses · Afternoon', isAIPick: false },
        { id: 'r6', time: '06:00 PM', name: 'Evening Walk', description: '20 min · Light activity', isAIPick: false },
        { id: 'r7', time: '09:00 PM', name: 'Hydration Final', description: '1 glass · Evening', isAIPick: false },
        { id: 'r8', time: '10:00 PM', name: 'Wind Down', description: 'No screens · Dim lights', isAIPick: true },
      ],
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/auth/profile ────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

module.exports = { signup, login, getProfile };
