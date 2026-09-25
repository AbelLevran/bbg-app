import prisma from '../db/prisma.js';
import { hashPassword, generateTemporaryPassword } from '../utils/password.js';
import { formatUser } from './auth.service.js';

export async function resetPassword({ targetUserId, requesterUser }) {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      department: {
        select: { id: true, name: true }
      }
    }
  });

  if (!targetUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // Permission checks per prd.md §4.1 & design.md §5
  if (requesterUser.role === 'HEAD_GROUP') {
    // Head Group can reset anyone's password
  } else if (requesterUser.role === 'DEPARTMENT_HEAD') {
    // Department Head can only reset password of members in their department
    if (!targetUser.department_id || targetUser.department_id !== requesterUser.department_id) {
      const error = new Error('Department Heads can only reset passwords for members of their own department');
      error.statusCode = 403;
      throw error;
    }
  } else {
    // Member cannot reset passwords
    const error = new Error('Forbidden: Insufficient permissions to reset passwords');
    error.statusCode = 403;
    throw error;
  }

  const temporaryPassword = generateTemporaryPassword(10);
  const passwordHash = await hashPassword(temporaryPassword);

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      password_hash: passwordHash,
      must_change_password: true
    },
    include: {
      department: {
        select: { id: true, name: true }
      }
    }
  });

  // Invalidate any active refresh tokens for the target user
  await prisma.refreshToken.updateMany({
    where: { user_id: targetUserId, revoked: false },
    data: { revoked: true }
  });

  return {
    temporaryPassword,
    user: formatUser(updatedUser)
  };
}

import { getUserWorkload, getUserWeeklyTrend } from './workload.service.js';

export async function getEmployeeDetail({ userId, weekDate }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      department: {
        select: { id: true, name: true }
      }
    }
  });

  if (!user || !user.is_active) {
    const error = new Error('Employee not found or inactive');
    error.statusCode = 404;
    throw error;
  }

  const week = weekDate || new Date().toISOString().slice(0, 10);
  
  // Parallel fetch: current workload, 4-week trend, and ticket status breakdown
  const [currentWorkload, weeklyTrend, statusGroups] = await Promise.all([
    getUserWorkload(userId, week),
    getUserWeeklyTrend(userId, week, 4),
    prisma.ticket.groupBy({
      by: ['status'],
      where: { assigned_to: userId },
      _count: { _all: true }
    })
  ]);

  const statusMap = {
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    STUCK: 0,
    DONE: 0,
    CANCELLED: 0
  };
  for (const g of statusGroups) {
    statusMap[g.status] = g._count._all;
  }

  return {
    user: formatUser(user),
    week,
    currentWorkload,
    weeklyTrend,
    statusCounts: statusMap
  };
}

