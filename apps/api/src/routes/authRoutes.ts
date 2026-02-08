import { Router } from 'express';
import { login, register, refresh, logout, me, googleAuthStart, googleAuthCallback } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.get('/google', googleAuthStart);
router.get('/google/callback', googleAuthCallback);

export default router;
