import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import { env } from '../config/env';
import { generateRefreshToken, hashToken } from '../utils/crypto';
import { signAccessToken } from '../utils/jwt';
import { createSession, deleteSessionByHash, findSessionByHash, updateSession } from '../repositories/sessionRepository';
import { findUserByEmail, findUserByUsername, findUserForLogin } from '../repositories/userRepository';
import { createUserWithDefaults } from './userService';

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};

export async function registerUser(params: {
  username: string;
  email?: string | null;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const existingUsername = await findUserByUsername(params.username);
  if (existingUsername) {
    throw new Error('USERNAME_TAKEN');
  }

  if (params.email) {
    const existingEmail = await findUserByEmail(params.email);
    if (existingEmail) {
      throw new Error('EMAIL_TAKEN');
    }
  }

  const passwordHash = await bcrypt.hash(params.password, 12);
  const user = await createUserWithDefaults({
    username: params.username,
    email: params.email ?? null,
    passwordHash
  });

  const tokens = await createSessionTokens({
    userId: user.id,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress
  });

  return { user, tokens };
}

export async function loginUser(params: {
  identifier: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const user = await findUserForLogin(params.identifier);
  if (!user || !user.passwordHash) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const isValid = await bcrypt.compare(params.password, user.passwordHash);
  if (!isValid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const tokens = await createSessionTokens({
    userId: user.id,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress
  });

  return { user, tokens };
}

export async function createSessionTokens(params: {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<SessionTokens> {
  // Generate a long-lived refresh token and store only its hash in the database.
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const refreshExpiresAt = dayjs().add(env.refreshTokenTtlDays, 'day').toDate();

  const session = await createSession({
    user: { connect: { id: params.userId } },
    refreshTokenHash,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
    expiresAt: refreshExpiresAt
  });

  // Access tokens are short-lived JWTs used for fast auth checks without DB reads.
  const accessToken = signAccessToken({ sub: params.userId, sessionId: session.id });

  return { accessToken, refreshToken, refreshExpiresAt };
}

export async function refreshSession(refreshToken: string) {
  const refreshTokenHash = hashToken(refreshToken);
  const session = await findSessionByHash(refreshTokenHash);

  if (!session) {
    throw new Error('INVALID_SESSION');
  }

  if (dayjs(session.expiresAt).isBefore(dayjs())) {
    await deleteSessionByHash(refreshTokenHash);
    throw new Error('SESSION_EXPIRED');
  }

  // Rotate refresh tokens on every use to reduce replay risk.
  const newRefreshToken = generateRefreshToken();
  const newRefreshHash = hashToken(newRefreshToken);
  const newExpiresAt = dayjs().add(env.refreshTokenTtlDays, 'day').toDate();

  await updateSession(session.id, {
    refreshTokenHash: newRefreshHash,
    expiresAt: newExpiresAt,
    lastUsedAt: new Date()
  });

  const accessToken = signAccessToken({ sub: session.userId, sessionId: session.id });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    refreshExpiresAt: newExpiresAt
  };
}

export async function logoutSession(refreshToken: string) {
  const refreshTokenHash = hashToken(refreshToken);
  try {
    await deleteSessionByHash(refreshTokenHash);
  } catch (error) {
    // Ignore if already deleted.
  }
}
