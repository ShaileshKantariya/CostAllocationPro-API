import express from 'express';
import syncLogController from '../controllers/syncLogController';
const router = express.Router();

router.get('/', syncLogController.getSyncLogs);

export default router;
