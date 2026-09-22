import prisma from '../db/prisma.js';
import { verifyAccessToken } from '../utils/jwt.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Unauthorized: Invalid or expired access token'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        department: {
          select: { id: true, name: true }
        }
      }
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Account is inactive or does not exist'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required'
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to perform this action'
      });
    }

    next();
  };
}
