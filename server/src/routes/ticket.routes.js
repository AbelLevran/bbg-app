import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  changeStatus,
  createRecurringSeries,
  addNextOccurrence,
  getSeriesSiblings
} from '../controllers/ticket.controller.js';
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  addManualTime
} from '../controllers/timer.controller.js';

const router = Router();

// All ticket routes require authentication
router.use(authenticate);

// Recurring series creation (must be before /:id)
router.post('/recurring-series', createRecurringSeries);

// Collection
router.get('/', listTickets);
router.post('/', createTicket);

// Single ticket
router.get('/:id', getTicket);
router.patch('/:id', updateTicket);
router.delete('/:id', deleteTicket);
router.patch('/:id/status', changeStatus);

// Recurring series sub-routes
router.post('/:id/recurrence/next-occurrence', addNextOccurrence);
router.get('/:id/recurrence/siblings', getSeriesSiblings);

// Timer sub-routes
router.post('/:id/timer/start', startTimer);
router.post('/:id/timer/pause', pauseTimer);
router.post('/:id/timer/resume', resumeTimer);
router.post('/:id/timer/stop', stopTimer);

// Manual time entry
router.post('/:id/manual-time', addManualTime);

export default router;
