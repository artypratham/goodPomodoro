const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');
const { normalizeUsername, validateUsername, validatePassword } = require('./api/_lib/validation');
const { DEFAULT_SETTINGS, DEFAULT_STATS } = require('./api/_lib/defaults');
const { encryptJson, decryptJson } = require('./api/_lib/crypto');
const { rateLimit } = require('./api/_lib/ratelimit');

const app = express();
const PORT = process.env.PORT || 3847;
const JWT_SECRET = process.env.JWT_SECRET || 'pomodoro-focus-dev-secret';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'production' && JWT_SECRET === 'pomodoro-focus-dev-secret') {
  console.warn('WARNING: JWT_SECRET is using the development default. Set JWT_SECRET in production.');
}

let redisClient;

// Initialize Redis connection
async function initRedis() {
  redisClient = createClient({
    url: REDIS_URL
  });

  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  redisClient.on('connect', () => console.log('Connected to Redis'));
  
  await redisClient.connect();
}

app.disable('x-powered-by');
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  const forwardedProto = req.headers['x-forwarded-proto'];
  const isSecure = req.secure || forwardedProto === 'https';
  const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';

  if (NODE_ENV === 'production' && isSecure && !isLocalhost) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  next();
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

function applySettingsUpdate(current, payload) {
  const next = { ...current };
  const errors = [];

  const validateNumber = (key, min, max) => {
    if (!(key in payload)) return;
    const value = Number(payload[key]);
    if (!Number.isFinite(value)) {
      errors.push(`${key} must be a number`);
      return;
    }
    if (value < min || value > max) {
      errors.push(`${key} must be between ${min} and ${max}`);
      return;
    }
    next[key] = Math.round(value);
  };

  const validateBoolean = (key) => {
    if (!(key in payload)) return;
    if (typeof payload[key] !== 'boolean') {
      errors.push(`${key} must be a boolean`);
      return;
    }
    next[key] = payload[key];
  };

  validateNumber('focusDuration', 1, 120);
  validateNumber('shortBreakDuration', 1, 30);
  validateNumber('longBreakDuration', 1, 60);
  validateNumber('sessionsBeforeLongBreak', 1, 10);
  validateBoolean('autoStartBreaks');
  validateBoolean('autoStartFocus');
  validateBoolean('soundEnabled');

  return { next, errors };
}

// Register endpoint
app.post('/api/register', async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password || '');

    const usernameError = validateUsername(username);
    if (usernameError) {
      return res.status(400).json({ error: usernameError });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const rate = await rateLimit({
      client: redisClient,
      key: `rl:register:${getClientIp(req)}`,
      limit: 5,
      windowSec: 60
    });

    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfter || 60));
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    // Check if user exists
    const existingUser = await redisClient.get(`user:${username}`);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Store user
    const userId = uuidv4();
    await redisClient.set(`user:${username}`, JSON.stringify({
      id: userId,
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    }));

    // Initialize user stats
    await redisClient.set(`stats:${userId}`, encryptJson({ ...DEFAULT_STATS }));

    // Initialize user settings
    await redisClient.set(`settings:${userId}`, encryptJson({ ...DEFAULT_SETTINGS }));

    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '30d' });
    
    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: { id: userId, username }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password || '');

    const usernameError = validateUsername(username);
    if (usernameError) {
      return res.status(400).json({ error: usernameError });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const rate = await rateLimit({
      client: redisClient,
      key: `rl:login:${getClientIp(req)}`,
      limit: 10,
      windowSec: 60
    });

    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfter || 60));
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    const userData = await redisClient.get(`user:${username}`);
    if (!userData) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = JSON.parse(userData);
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({ 
      token,
      user: { id: user.id, username }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user stats
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const statsData = await redisClient.get(`stats:${req.user.id}`);
    const stats = statsData ? decryptJson(statsData) : { ...DEFAULT_STATS };
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update stats after session completion
app.post('/api/stats/session', authenticateToken, async (req, res) => {
  try {
    const duration = Number(req.body?.duration);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 240) {
      return res.status(400).json({ error: 'Invalid duration' });
    }
    const today = new Date().toISOString().split('T')[0];
    
    const statsData = await redisClient.get(`stats:${req.user.id}`);
    const stats = statsData ? decryptJson(statsData) : { ...DEFAULT_STATS };

    // Update session counts
    stats.totalSessions += 1;
    stats.totalFocusMinutes += duration;
    
    // Update daily sessions
    if (!stats.dailySessions[today]) {
      stats.dailySessions[today] = 0;
    }
    stats.dailySessions[today] += 1;

    // Update streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (stats.lastSessionDate === yesterdayStr) {
      stats.currentStreak += 1;
    } else if (stats.lastSessionDate !== today) {
      stats.currentStreak = 1;
    }

    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
    }

    stats.lastSessionDate = today;

    await redisClient.set(`stats:${req.user.id}`, encryptJson(stats));
    
    res.json(stats);
  } catch (error) {
    console.error('Update stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user settings
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const settingsData = await redisClient.get(`settings:${req.user.id}`);
    const settings = settingsData ? decryptJson(settingsData) : { ...DEFAULT_SETTINGS };
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user settings
app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const settingsData = await redisClient.get(`settings:${req.user.id}`);
    const currentSettings = settingsData ? decryptJson(settingsData) : { ...DEFAULT_SETTINGS };
    const { next, errors } = applySettingsUpdate(currentSettings, req.body || {});

    if (errors.length) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    await redisClient.set(`settings:${req.user.id}`, encryptJson(next));
    res.json(next);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', redis: redisClient.isOpen });
});

// Start server
async function start() {
  try {
    await initRedis();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // Fallback: run without Redis (use local storage only)
    console.log('Running in offline mode without Redis');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT} (offline mode)`);
    });
  }
}

start();
