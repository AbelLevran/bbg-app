import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'BBG Management API'
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export default router;
