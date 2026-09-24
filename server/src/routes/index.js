import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import ticketRoutes from './ticket.routes.js';
import timerRoutes from './timer.routes.js';
import orgRoutes from './org.routes.js';
import workloadRoutes from './workload.routes.js';
import reportRoutes from './report.routes.js';
import eventRoutes from './event.routes.js';

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
router.use('/tickets', ticketRoutes);
router.use('/timer', timerRoutes);
router.use('/org', orgRoutes);
router.use('/workload', workloadRoutes);
router.use('/reports', reportRoutes);
router.use('/events', eventRoutes);

export default router;
