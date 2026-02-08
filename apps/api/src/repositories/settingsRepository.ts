import { prisma } from '../db/prisma';
import type { Prisma } from '@prisma/client';

export function getSettings(userId: string) {
  return prisma.userSettings.findUnique({
    where: { userId }
  });
}

export function updateSettings(userId: string, data: Prisma.UserSettingsUpdateInput) {
  return prisma.userSettings.update({
    where: { userId },
    data
  });
}
