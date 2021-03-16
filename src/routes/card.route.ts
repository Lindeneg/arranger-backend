import { Router } from 'express';
import { check } from 'express-validator';

import { 
} from '../controllers/list.controller';
import { authCheck } from '../middleware/auth.middleware';
import { RULE } from '../util';


const router = Router();

// all subsequent routes should utilize authentication
router.use(authCheck);

// create new card
router.post('/', 
    [
        check('description').isLength({ min: 1,  max: RULE.DES_MAX_LEN }),
        check('color').isLength({       min: 1,  max: RULE.DEFAULT_MAX_LEN }),
        check('name').isLength({        min: 1,  max: RULE.USR_MAX_LEN }),
        check('owner').not().isEmpty()
    ],
    createList
);

// get all cards from list id
router.get('/board/:boardId',
    getListsByBoardId
);

// get card from card id
router.get('/:listId',
    getListByListId
);

// update card from card id
router.patch('/:listId',
    [
        check('description').isLength({ min: 1,  max: RULE.DES_MAX_LEN }),
        check('color').isLength({       min: 1,  max: RULE.DEFAULT_MAX_LEN }),
        check('name').isLength({        min: 1,  max: RULE.USR_MAX_LEN })
    ],
    updateListByListId
);

// delete card from card id
router.delete('/:listId', deleteListByListId);


export default router;