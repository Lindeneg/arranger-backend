import { Router } from 'express';
import { check } from 'express-validator';

import {
    createCard,
    getCardsByListId,
    getCardByCardId,
    updateCardByCardId,
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
        check('description').isLength({ min: 1, max: RULE.DES_MAX_LEN }),
        check('color').isLength({ min: 1, max: RULE.DEFAULT_MAX_LEN }),
        check('name').isLength({ min: 1, max: RULE.USR_MAX_LEN }),
        check('owner').not().isEmpty()
    ],
    createCard
);

// get all cards from list id
router.get('/list/:listId', getCardsByListId);

// get card from card id
router.get('/:cardId', getCardByCardId);

// update card from card id
router.patch(
    '/:cardId',
    [
        check('description').isLength({ min: 1, max: RULE.DES_MAX_LEN }),
        check('color').isLength({ min: 1, max: RULE.DEFAULT_MAX_LEN }),
        check('name').isLength({ min: 1, max: RULE.USR_MAX_LEN }),
        check('owner').not().isEmpty()
    ],
    updateCardByCardId
);

// delete card from card id
router.delete('/:cardId', deleteCardByCardId);

export default router;
