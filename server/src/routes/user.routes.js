import { Router } from 'express';
import { z } from 'zod';
import * as userController from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

const resetPasswordSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user UUID')
  })
});

// Admin-driven password reset per prd.md §4.1 (HEAD_GROUP or DEPARTMENT_HEAD)
router.post(
  '/:id/reset-password',
  authenticate,
  authorize('HEAD_GROUP', 'DEPARTMENT_HEAD'),
  validate(resetPasswordSchema),
  userController.resetPassword
);

export default router;
