import { Router } from 'express';
import { getStats, recordSession } from '../controllers/statsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getStats);
router.post('/session', requireAuth, recordSession);

export default router;
