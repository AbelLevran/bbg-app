import bcrypt from 'bcryptjs';

export async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, 10);
}

export async function comparePassword(plainTextPassword, hash) {
  return bcrypt.compare(plainTextPassword, hash);
}

export function generateTemporaryPassword(length = 10) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
