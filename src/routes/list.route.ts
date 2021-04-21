import { Router } from 'express';
import { check } from 'express-validator';

import {
    createList,
    updateListByListId,
    updateListCardOrder,
    deleteListByListId
} from '../controllers/list.controller';
import { authCheck } from '../middleware/auth.middleware';
import { RULE } from '../util';

const router = Router();

// all subsequent routes should utilize authentication
router.use(authCheck);

// create new list
router.post(
    '/',
    [check('name').isLength({ min: 1, max: RULE.LST_MAX_LEN }), check('owner').not().isEmpty()],
    createList
);

// update list from list id
router.patch(
    '/:listId',
    check('name').isLength({ min: 1, max: RULE.LST_MAX_LEN }),
    updateListByListId
);

// update card order in list
router.patch(
    '/update/card/order',
    [
        check(['srcId', 'desId', 'targetId']).not().isEmpty(),
        check(['srcIdx', 'desIdx']).isNumeric()
    ],
    updateListCardOrder
);

// delete list from list id
router.delete('/:listId', deleteListByListId);

export default router;
