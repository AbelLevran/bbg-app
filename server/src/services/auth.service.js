import prisma from '../db/prisma.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../utils/jwt.js';

export function formatUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    title: user.title,
    departmentId: user.department_id,
    departmentName: user.department?.name || null,
    mustChangePassword: user.must_change_password,
    isActive: user.is_active,
    createdAt: user.created_at
  };
}

export async function login({ username, password }) {
  const normalizedUsername = username.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      username: { equals: normalizedUsername, mode: 'insensitive' }
    },
    include: {
      department: {
        select: { id: true, name: true }
      }
    }
  });

  // Do not leak whether user exists (prd.md §4.1)
  if (!user || !user.is_active) {
    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const tokenHash = hashToken(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt
    }
  });

  return {
    accessToken,
    refreshToken,
    user: formatUser(user)
  };
}

export async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) {
    const error = new Error('Refresh token required');
    error.statusCode = 401;
    throw error;
  }

  const payload = verifyRefreshToken(rawRefreshToken);
  if (!payload) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  const hashedToken = hashToken(rawRefreshToken);
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token_hash: hashedToken },
    include: {
      user: {
        include: {
          department: {
            select: { id: true, name: true }
          }
        }
      }
    }
  });

  if (!tokenRecord || tokenRecord.revoked || new Date(tokenRecord.expires_at) < new Date()) {
    const error = new Error('Refresh token is invalid, revoked, or expired');
    error.statusCode = 401;
    throw error;
  }

  if (!tokenRecord.user.is_active) {
    const error = new Error('User account is inactive');
    error.statusCode = 401;
    throw error;
  }

  // Rotate token: revoke current token
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revoked: true }
  });

  // Issue new pair
  const newAccessToken = signAccessToken(tokenRecord.user);
  const newRefreshToken = signRefreshToken(tokenRecord.user);
  const newHashedToken = hashToken(newRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      user_id: tokenRecord.user.id,
      token_hash: newHashedToken,
      expires_at: expiresAt
    }
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: formatUser(tokenRecord.user)
  };
}

export async function logout(rawRefreshToken) {
  if (rawRefreshToken) {
    const hashedToken = hashToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { token_hash: hashedToken },
      data: { revoked: true }
    });
  }
  return true;
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      department: {
        select: { id: true, name: true }
      }
    }
  });

  if (!user || !user.is_active) {
    const error = new Error('User not found or inactive');
    error.statusCode = 404;
    throw error;
  }

  return formatUser(user);
}

export async function changePassword({ userId, currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    const error = new Error('Both current and new password are required');
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 6) {
    const error = new Error('New password must be at least 6 characters long');
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || !user.is_active) {
    const error = new Error('User not found or inactive');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await comparePassword(currentPassword, user.password_hash);
  if (!isMatch) {
    const error = new Error('Current password does not match');
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await hashPassword(newPassword);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      password_hash: passwordHash,
      must_change_password: false
    },
    include: {
      department: {
        select: { id: true, name: true }
      }
    }
  });

  return formatUser(updatedUser);
}

