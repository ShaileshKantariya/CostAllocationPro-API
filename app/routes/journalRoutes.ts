import express from 'express';
import { journalController } from '../controllers';
import { isAuthenticated } from '../middlewares/authMiddleware';
import { journalValidator } from '../helpers/validators';
const router = express.Router();

// Get all journal entries
router.get('/entries', isAuthenticated, journalController.getJournalEntries);

// Create or Update journals
router.post('/create', isAuthenticated, journalValidator, journalController.createJournal);

//Get all journals
router.get('/', isAuthenticated, journalController.getAllJournals);

//Get latest journal no
router.get('/latest-no', isAuthenticated, journalController.getLatestJournalNo);

//Get Journal By PayPeriod
router.get('/by-payPeriod', isAuthenticated, journalController.getJournalByPayPeriod);

export default router;
