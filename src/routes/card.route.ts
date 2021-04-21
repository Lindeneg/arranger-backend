import { Router } from 'express';
import { check } from 'express-validator';

import {
	createCard,
	updateCardByCardId,
	updateCardChecklistOrderByCardId,
	deleteCardByCardId
} from '../controllers/card.controller';
import { authCheck } from '../middleware/auth.middleware';
import { RULE } from '../util';

const router = Router();

// all subsequent routes should utilize authentication
router.use(authCheck);

// create new card
router.post(
	'/',
	[
		check('color').isLength({ min: RULE.COL_MIN_LEN, max: RULE.COL_MAX_LEN }),
		check('name').isLength({ min: 1, max: RULE.CRD_NAME_MAX_LEN }),
		check('owner').not().isEmpty()
	],
	createCard
);

// // update card from card id
router.patch('/:cardId', check('owner').not().isEmpty(), updateCardByCardId);

// update card checklist list order from card id
router.patch(
	'/:cardId/update/checklist/order',
	[check('srcIdx').isNumeric(), check('desIdx').isNumeric()],
	updateCardChecklistOrderByCardId
);

// delete card from card id
router.delete('/:cardId', deleteCardByCardId);

export default router;
