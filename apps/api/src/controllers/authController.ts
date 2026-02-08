import type { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { registerUser, loginUser, refreshSession, logoutSession, createSessionTokens } from '../services/authService';
import { setAuthCookies, clearAuthCookies } from '../utils/authCookies';
import { REFRESH_COOKIE } from '../utils/cookies';
import { env } from '../config/env';
import { buildGoogleAuthUrl, exchangeCodeForProfile } from '../services/googleAuthService';
import { generateCodeChallenge, generateCodeVerifier } from '../utils/pkce';
import { findOrCreateUserFromGoogle } from '../services/oauthService';
import { prisma } from '../db/prisma';

const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email().optional(),
  password: z.string().min(8).max(72)
});

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(8).max(72)
});

const refreshSchema = z.object({});

const oauthCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax' as const,
  maxAge: 10 * 60 * 1000,
  path: '/'
};

function resolveRedirectUrl(raw?: string) {
  const fallback = env.webUrl;
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    const allowedOrigins = env.corsOrigin.split(',').map((value: string) => value.trim());
    if (allowedOrigins.includes(url.origin)) {
      return url.toString();
    }
  } catch {
    // Ignore invalid redirect values.
  }
  return fallback;
}

export async function register(req: Request, res: Response) {
  try {
    const parsed = registerSchema.parse(req.body);
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const { user, tokens } = await registerUser({
      username: parsed.username.toLowerCase(),
      email: parsed.email?.toLowerCase(),
      password: parsed.password,
      userAgent,
      ipAddress
    });

    setAuthCookies(res, tokens);
    res.status(201).json({
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }

    if (error instanceof Error) {
      if (error.message === 'USERNAME_TAKEN') {
        res.status(409).json({ error: 'Username already exists' });
        return;
      }
      if (error.message === 'EMAIL_TAKEN') {
        res.status(409).json({ error: 'Email already exists' });
        return;
      }
    }

    res.status(500).json({ error: 'Server error' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const parsed = loginSchema.parse(req.body);
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const { user, tokens } = await loginUser({
      identifier: parsed.identifier.toLowerCase(),
      password: parsed.password,
      userAgent,
      ipAddress
    });

    setAuthCookies(res, tokens);
    res.status(200).json({
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }

    if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    res.status(500).json({ error: 'Server error' });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    refreshSchema.parse(req.body);
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      res.status(401).json({ error: 'Missing refresh token' });
      return;
    }

    const tokens = await refreshSession(refreshToken);
    setAuthCookies(res, tokens);
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(401).json({ error: 'Session expired' });
  }
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (refreshToken) {
    await logoutSession(refreshToken);
  }
  clearAuthCookies(res);
  res.status(200).json({ ok: true });
}

export async function me(req: Request, res: Response) {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.sub },
    select: { id: true, username: true, email: true, name: true, avatarUrl: true }
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.status(200).json({ user });
}

export async function googleAuthStart(req: Request, res: Response) {
  try {
    const state = crypto.randomUUID();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const redirectUrl = resolveRedirectUrl(typeof req.query.redirect === 'string' ? req.query.redirect : undefined);

    res.cookie('oauth_state', state, oauthCookieOptions);
    res.cookie('oauth_verifier', codeVerifier, oauthCookieOptions);
    res.cookie('oauth_redirect', redirectUrl, oauthCookieOptions);

    const url = buildGoogleAuthUrl({ state, codeChallenge });
    res.redirect(url);
  } catch (error) {
    res.status(500).json({ error: 'Google OAuth not configured' });
  }
}

export async function googleAuthCallback(req: Request, res: Response) {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const storedState = req.cookies?.oauth_state;
    const codeVerifier = req.cookies?.oauth_verifier;
    const redirectUrl = resolveRedirectUrl(req.cookies?.oauth_redirect);

    if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
      res.status(400).send('Invalid OAuth state');
      return;
    }

    const profile = await exchangeCodeForProfile({ code, codeVerifier });
    const user = await findOrCreateUserFromGoogle(profile);

    const tokens = await createSessionTokens({
      userId: user.id,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });

    setAuthCookies(res, tokens);

    res.clearCookie('oauth_state', oauthCookieOptions);
    res.clearCookie('oauth_verifier', oauthCookieOptions);
    res.clearCookie('oauth_redirect', oauthCookieOptions);

    res.redirect(redirectUrl);
  } catch (error) {
    res.status(500).send('Google auth failed');
  }
}
