import { Router } from 'express';
import { check } from 'express-validator';

import { signupUser, loginUser, updateUser, deleteUser } from '../controllers/user.controller';
import { authCheck } from '../middleware/auth.middleware';
import { RULE } from '../util';

const router = Router();

// create new user
router.post(
    '/signup',
    [
        check('username').isLength({ min: RULE.USR_MIN_LEN, max: RULE.USR_MAX_LEN }),
        check('password').isLength({ min: RULE.PW_MIN_LEN, max: RULE.PW_MAX_LEN }),
        check('theme').isLength({ min: 4, max: 5 })
    ],
    signupUser
);

// login existing user
router.post(
    '/login',
    [
        check('username').isLength({ min: RULE.USR_MIN_LEN, max: RULE.USR_MAX_LEN }),
        check('password').isLength({ min: RULE.PW_MIN_LEN, max: RULE.PW_MAX_LEN })
    ],
    loginUser
);

// all subsequent routes should utilize authentication
router.use(authCheck);

// update user
router.patch('/', updateUser);

// delete existing user
router.delete('/', deleteUser);

export default router;
