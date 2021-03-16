import { Router } from 'express';
import { check } from 'express-validator';

import { 
    createList,
    getListsByBoardId,
    getListByListId,
    updateListByListId,
    deleteListByListId
} from '../controllers/list.controller';
import { authCheck } from '../middleware/auth.middleware';
import { RULE } from '../util';


const router = Router();

// all subsequent routes should utilize authentication
router.use(authCheck);

// create new list
router.post('/', 
    [
        check('name').isLength({ min: 1,  max: RULE.DEFAULT_MAX_LEN }),
        check('owner').not().isEmpty()
    ],
    createList
);

// get all lists from board id
router.get('/board/:boardId',
    getListsByBoardId
);

// get list from list id
router.get('/:listId',
    getListByListId
);

// update list from list id
router.patch('/:listId',
    [
        check('name').isLength({ min: 1,  max: RULE.DEFAULT_MAX_LEN }),
    ],
    updateListByListId
);

// delete list from list id
router.delete('/:listId', deleteListByListId);


export default router;