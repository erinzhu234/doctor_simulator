import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();
const SECRET = 'cs144project';

// Simple hardcoded user for demo
const DEMO_USER = { username: 'doctor' };

router.post('/login', (req, res) => {
  const { username } = req.body;
  if (username === DEMO_USER.username) {
    const token = jwt.sign({ username }, SECRET, { expiresIn: '1h' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // set to true in production with HTTPS
      sameSite: 'Lax',
    });
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ user: null });

  try {
    const decoded = jwt.verify(token, SECRET);
    res.json({ user: decoded.username });
  } catch {
    res.status(401).json({ user: null });
  }
});

export default router;
