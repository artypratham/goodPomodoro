import { prisma } from '../db/prisma';
import type { Prisma } from '@prisma/client';

export function getStats(userId: string) {
  return prisma.userStats.findUnique({
    where: { userId }
  });
}

export function updateStats(userId: string, data: Prisma.UserStatsUpdateInput) {
  return prisma.userStats.update({
    where: { userId },
    data
  });
}

export function upsertDailyStat(userId: string, date: Date, sessionsIncrement: number) {
  return prisma.dailyStat.upsert({
    where: { userId_date: { userId, date } },
    update: { sessions: { increment: sessionsIncrement } },
    create: { userId, date, sessions: sessionsIncrement }
  });
}

export function listDailyStatsSince(userId: string, since: Date) {
  return prisma.dailyStat.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: 'asc' }
  });
}
