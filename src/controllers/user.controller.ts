import { validationResult, Result, ValidationError } from 'express-validator';
import { startSession, ClientSession } from 'mongoose';
import bcrypt from 'bcryptjs';

import User, { IUser } from '../models/user.model';
import Board from '../models/board.model';
import Checklist from '../models/checklist.model';
import Card from '../models/card.model';
import List from '../models/list.model';
import HTTPException from '../models/exception.model';
import { getToken, EMiddleware, SBody } from '../util';

export const signupUser: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);
    // verify request body
    if (!errors.isEmpty()) {
        return next(HTTPException.rMalformed(errors));
    }
    // extract request data from body
    const { username, password, theme }: SBody = req.body;
    try {
        const existingUser: IUser | null = await User.findOne({ username });
        // verify uniqueness of user
        if (existingUser) {
            next(HTTPException.rUnprocessable('user already exists in system'));
        } else {
            const ts: number = new Date().getTime();
            const pwd: string = await bcrypt.hash(password, 12);
            const newUser: IUser = new User({
                username,
                password: pwd,
                theme,
                boards: [],
                createdOn: ts,
                updatedOn: ts,
                lastLogin: ts
            });
            await newUser.save();
            // generate jwt token
            const token: string | null = getToken({ userId: newUser._id });
            if (token) {
                res.status(201).json({
                    token,
                    userId: newUser._id,
                    expires: Date.now() + 1000 * 60 * 60 * 6,
                    theme: newUser.theme
                });
            } else {
                next(HTTPException.rInternal('jwt token could not be generated'));
            }
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const loginUser: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);
    // verify request body
    if (!errors.isEmpty()) {
        return next(HTTPException.rMalformed(errors));
    }
    // extract request data from body
    const { username, password }: SBody = req.body;
    try {
        const foundUser: IUser | null = await User.findOne({ username });
        // verify user exists
        if (!foundUser) {
            next(HTTPException.rAuth());
        } else {
            const pwdValid: boolean = await bcrypt.compare(password, foundUser.password);
            // verify correctness of password
            if (!pwdValid) {
                next(HTTPException.rAuth());
            } else {
                foundUser.lastLogin = new Date().getTime();
                await foundUser.save();
                const token: string | null = getToken({ userId: foundUser._id });
                if (token) {
                    res.status(200).json({
                        token,
                        userId: foundUser._id,
                        expires: Date.now() + 1000 * 60 * 60 * 6,
                        theme: foundUser.theme
                    });
                } else {
                    next(HTTPException.rInternal('jwt token could not be generated'));
                }
            }
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const deleteUser: EMiddleware = async (req, res, next) => {
    // TODO test
    try {
        const foundUser: IUser | null = await User.findById(req.userData.userId);
        if (!foundUser) {
            next(HTTPException.rAuth());
        } else {
            // start transaction and attempt to save changes
            const session: ClientSession = await startSession();
            session.startTransaction();
            // remove all checklists tied to the user
            await Checklist.deleteMany({ indirectOwner: foundUser._id }, { session });
            // remove all cards tied to the user
            await Card.deleteMany({ indirectOwner: foundUser._id }, { session });
            // remove all lists tied to the user
            await List.deleteMany({ indirectOwner: foundUser._id }, { session });
            // remove all boards tied to the user
            await Board.deleteMany({ owner: foundUser._id }, { session });
            // finally remove the user itself
            await foundUser.remove({ session });
            // commit all changes
            await session.commitTransaction();
            // return deleted userId with 200 response
            res.status(200).json({ userId: foundUser._id });
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const updateUser: EMiddleware = async (req, res, next) => {
    // TODO test
    const { theme, password }: SBody<string | null | undefined> = req.body;
    try {
        const user: IUser | null = await User.findById(req.userData.userId);
        if (user) {
            let didUpdate = false;
            if (typeof theme !== 'undefined' && theme !== null) {
                user.theme = theme;
                didUpdate = true;
            }
            if (typeof password !== 'undefined' && password !== null) {
                user.password = await bcrypt.hash(password, 12);
                didUpdate = true;
            }
            if (didUpdate) {
                user.updatedOn = new Date().getTime();
                await user.save();
                res.status(200).json({ theme: user.theme });
            } else {
                next(HTTPException.rMalformed('no entries specified to update'));
            }
        } else {
            next(HTTPException.rNotFound('no user matches the requested id'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};
