import { prisma } from '../db/prisma';
import type { Prisma } from '@prisma/client';

export function createSession(data: Prisma.SessionCreateInput) {
  return prisma.session.create({ data });
}

export function findSessionByHash(refreshTokenHash: string) {
  return prisma.session.findUnique({
    where: { refreshTokenHash }
  });
}

export function updateSession(id: string, data: Prisma.SessionUpdateInput) {
  return prisma.session.update({ where: { id }, data });
}

export function deleteSession(id: string) {
  return prisma.session.delete({ where: { id } });
}

export function deleteSessionByHash(refreshTokenHash: string) {
  return prisma.session.delete({ where: { refreshTokenHash } });
}
