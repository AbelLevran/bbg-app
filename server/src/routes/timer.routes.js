import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { getActiveTimer, stopActiveTimer } from '../controllers/timer.controller.js';

const router = Router();

router.use(authenticate);

// Get current user's active timer state
router.get('/active', getActiveTimer);

// Force-stop the active timer (for "Stop & Start New" conflict resolution)
router.post('/stop-active', stopActiveTimer);

export default router;
