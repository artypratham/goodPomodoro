import crypto from 'crypto';
import { nanoid } from 'nanoid';

export function generateRefreshToken(): string {
  return nanoid(64);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
