import { prisma } from '../db/prisma';

export async function createUserWithDefaults(params: {
  username: string;
  email?: string | null;
  passwordHash?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: params.username,
        email: params.email ?? null,
        passwordHash: params.passwordHash ?? null,
        name: params.name ?? null,
        avatarUrl: params.avatarUrl ?? null
      }
    });

    await tx.userSettings.create({
      data: {
        userId: user.id
      }
    });

    await tx.userStats.create({
      data: {
        userId: user.id
      }
    });

    return user;
  });
}
