import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type AccessTokenPayload = {
  sub: string;
  sessionId: string;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }
  return jwt.sign(payload, env.jwtSecret, {
    issuer: env.jwtIssuer,
    expiresIn: `${env.accessTokenTtlMinutes}m`
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }
  const decoded = jwt.verify(token, env.jwtSecret, { issuer: env.jwtIssuer });
  return decoded as AccessTokenPayload;
}
