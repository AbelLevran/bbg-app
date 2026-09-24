import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { getDepartments, getUsers } from '../controllers/org.controller.js';

const router = Router();

router.use(authenticate);

router.get('/departments', getDepartments);
router.get('/users', getUsers);

export default router;
