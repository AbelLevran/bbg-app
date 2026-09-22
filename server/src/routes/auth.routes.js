import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required').trim(),
    password: z.string().min(1, 'Password is required')
  })
});

router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);

export default router;
