import { Router } from 'express';
import { check } from 'express-validator';

import {
    createBoard,
    getBoardsByUserId,
    getBoardByBoardId,
    updateBoardByBoardId,
    updateBoardListOrderByBoardId,
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
        check('color').isLength({ min: RULE.COL_MIN_LEN, max: RULE.COL_MAX_LEN }),
        check('name').isLength({ min: 1, max: RULE.BRD_MAX_LEN })
    ],
    createBoard
);

// get all boards from user id
router.get('/user/:userId', getBoardsByUserId);

// get board from board id
router.get('/:boardId', getBoardByBoardId);

// update board from board id
router.patch('/:boardId', updateBoardByBoardId);

// update board list order from board id
router.patch(
    '/:boardId/update/list/order',
    [check('srcIdx').isNumeric(), check('desIdx').isNumeric()],
    updateBoardListOrderByBoardId
);

// delete board from board id
router.delete('/:boardId', deleteBoardByBoardId);

export default router;
