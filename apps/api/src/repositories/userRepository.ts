import { prisma } from '../db/prisma';
import type { Prisma } from '@prisma/client';

export function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username }
  });
}

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email }
  });
}

export function findUserForLogin(identifier: string) {
  return prisma.user.findFirst({
    where: {
      OR: [{ username: identifier }, { email: identifier }]
    },
    select: {
      id: true,
      username: true,
      email: true,
      passwordHash: true
    }
  });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id }
  });
}

export function createUser(data: Prisma.UserCreateInput) {
  return prisma.user.create({ data });
}

export function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id }, data });
}
