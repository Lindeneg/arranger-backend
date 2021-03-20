import { Router } from 'express';
import { check } from 'express-validator';

import {
    createBoard,
    getBoardsByUserId,
    getBoardByBoardId,
    updateBoardByBoardId,
    deleteBoardByBoardId
} from '../controllers/board.controller';
import { authCheck } from '../middleware/auth.middleware';
import { RULE } from '../util';

const router = Router();

// all subsequent routes should utilize authentication
router.use(authCheck);

// create new board
router.post(
    '/',
    [
        check('color').isLength({ min: 1, max: RULE.DEFAULT_MAX_LEN }),
        check('name').isLength({ min: 1, max: RULE.DEFAULT_MAX_LEN })
    ],
    createBoard
);

// get all boards from user id
router.get('/user/:userId', getBoardsByUserId);

// get board from board id
router.get('/:boardId', getBoardByBoardId);

// update board from board id
router.patch(
    '/:boardId',
    [
        check('color').isLength({ min: 1, max: RULE.DEFAULT_MAX_LEN }),
        check('name').isLength({ min: 1, max: RULE.DEFAULT_MAX_LEN }),
        check('order').isArray()
    ],
    updateBoardByBoardId
);

// delete board from board id
router.delete('/:boardId', deleteBoardByBoardId);

export default router;
