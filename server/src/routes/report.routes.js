import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  weeklyWorkloadReport,
  weeklyWorkloadCsv,
  departmentReport,
  departmentCsv
} from '../controllers/report.controller.js';

const router = Router();
router.use(authenticate);

router.get('/weekly-workload', weeklyWorkloadReport);
router.get('/weekly-workload.csv', weeklyWorkloadCsv);
router.get('/department', departmentReport);
router.get('/department.csv', departmentCsv);

export default router;
