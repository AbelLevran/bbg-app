import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'bbg_access_super_secret_jwt_key_2026_dev';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'bbg_refresh_super_secret_jwt_key_2026_dev';
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.department_id || null
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

export function signRefreshToken(user) {
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      jti: crypto.randomUUID()
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
  return token;
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
