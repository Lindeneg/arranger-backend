import { Router } from 'express';
import { check } from 'express-validator';

import {
    createChecklist,
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
        check('objective').isLength({ min: 1, max: RULE.CHK_OBJ_MAX_LEN }),
        check('isCompleted').isBoolean(),
        check('owner').not().isEmpty()
    ],
    createChecklist
);

// update checklist from checklist id
router.patch('/:checklistId', updateChecklistByChecklistId);

// delete checklist from checklist id
router.delete('/:checklistId', deleteChecklistByChecklistId);

export default router;
