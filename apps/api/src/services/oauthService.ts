import { prisma } from '../db/prisma';
import { createAccount, findAccount } from '../repositories/oauthRepository';
import { createUserWithDefaults } from './userService';
import { sanitizeUsername } from '../utils/username';
import type { GoogleProfile } from './googleAuthService';

export async function findOrCreateUserFromGoogle(profile: GoogleProfile) {
  const existingAccount = await findAccount('google', profile.sub);
  if (existingAccount) {
    return existingAccount.user;
  }

  const email = profile.email.toLowerCase();
  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    await createAccount(existingByEmail.id, 'google', profile.sub);
    return existingByEmail;
  }

  const base = sanitizeUsername(profile.email.split('@')[0] ?? 'user');
  const username = await ensureUniqueUsername(base || 'user');

  const user = await createUserWithDefaults({
    username,
    email,
    name: profile.name ?? null,
    avatarUrl: profile.picture ?? null,
    passwordHash: null
  });

  await createAccount(user.id, 'google', profile.sub);
  return user;
}

async function ensureUniqueUsername(base: string) {
  let candidate = base;
  let counter = 0;

  while (true) {
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
    counter += 1;
    candidate = `${base}${counter}`.slice(0, 20);
  }
}
