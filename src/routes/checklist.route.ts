import { Router } from 'express';
import { check } from 'express-validator';

import {
    createChecklist,
    getChecklistsByCardId,
    getChecklistByChecklistId,
    updateChecklistByChecklistId,
    deleteChecklistByChecklistId
} from '../controllers/checklist.controller';
import { authCheck } from '../middleware/auth.middleware';
import { RULE } from '../util';

const router = Router();

// all subsequent routes should utilize authentication
router.use(authCheck);

// create new checklist
router.post(
    '/',
    [
        check('name').isLength({ min: 1, max: RULE.DEFAULT_MAX_LEN }),
        check('description').isLength({ min: 1, max: RULE.CHECKLIST_MAX_LEN }),
        check('isCompleted').isBoolean(),
        check('owner').not().isEmpty()
    ],
    createChecklist
);

// get all checklists from card id
router.get('/card/:cardId', getChecklistsByCardId);

// get checklist from checklist id
router.get('/:checklistId', getChecklistByChecklistId);

// update checklist from checklist id
router.patch(
    '/:checklistId',
    [
        check('name').isLength({ min: 1, max: RULE.DEFAULT_MAX_LEN }),
        check('description').isLength({ min: 1, max: RULE.CHECKLIST_MAX_LEN }),
        check('isCompleted').isBoolean()
    ],
    updateChecklistByChecklistId
);

// delete checklist from checklist id
router.delete('/:checklistId', deleteChecklistByChecklistId);

export default router;
