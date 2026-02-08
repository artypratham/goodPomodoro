import { prisma } from '../db/prisma';

export function findAccount(provider: string, providerAccountId: string) {
  return prisma.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    include: { user: true }
  });
}

export function createAccount(userId: string, provider: string, providerAccountId: string) {
  return prisma.oAuthAccount.create({
    data: {
      userId,
      provider,
      providerAccountId
    }
  });
}
