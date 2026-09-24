import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  getUserWorkloadHandler,
  getUserTrendHandler,
  getUserDailyHandler,
  getDeptWorkloadHandler,
  getGroupWorkloadHandler,
  getWorkloadAlertsHandler,
  setCapacityHandler
} from '../controllers/workload.controller.js';

const router = Router();
router.use(authenticate);

router.get('/user/:userId', getUserWorkloadHandler);
router.get('/user/:userId/trend', getUserTrendHandler);
router.get('/user/:userId/daily', getUserDailyHandler);
router.get('/department/:deptId', getDeptWorkloadHandler);
router.get('/group', getGroupWorkloadHandler);
router.get('/alerts', getWorkloadAlertsHandler);
router.put('/capacity/:userId', setCapacityHandler);

export default router;
