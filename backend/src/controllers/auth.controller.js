import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// name/email are embedded in the token (not just userId) so the Socket.io
// auth middleware can identify a connecting user without an extra DB
// round-trip on every connection. They're only ever used for display —
// anything security-sensitive still goes through userId + a DB lookup.
function signToken(user) {
  return jwt.sign(
    { userId: user._id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function toClientUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

export async function signup(req, res) {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    const token = signToken(user);
    res.status(201).json({ token, user: toClientUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: toClientUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function me(req, res) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(toClientUser(user));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load user' });
  }
}