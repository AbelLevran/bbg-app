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
