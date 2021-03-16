import { validationResult, Result, ValidationError } from 'express-validator';
import { startSession, ClientSession } from 'mongoose';
import bcrypt from 'bcryptjs';

import User, { IUser } from '../models/user.model';
import Board from '../models/board.model';
import HTTPException from '../models/exception.model';
import { getToken, EMiddleware, SBody } from '../util';


export const signupUser: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);

    if (!errors.isEmpty()) {
        return next(HTTPException.rMalformed(errors));
    }
    
    const { username, password }: SBody = req.body;

    try {
        const existingUser: IUser | null = await User.findOne({ username });
        if (existingUser) {
            next(HTTPException.rUnprocessable('user already exists in system'));
        } else {
            const ts     : number = new Date().getTime();
            const pwd    : string = await bcrypt.hash(password, 12);
            const newUser: IUser  = new User({  
                username, 
                password : pwd, 
                boards   : [], 
                createdOn: ts, 
                updatedOn: ts,
                lastLogin: ts
            });
            await newUser.save();
            const token: string | null = getToken({ userId: newUser._id });
            if (token) {
                res.status(201).json({
                    token,
                    _id: newUser._id
                });
            } else {
                next(HTTPException.rInternal('jwt token could not be generated'));
            }
        }
    } catch(err) {
        next(HTTPException.rInternal(err));
    }
};


export const loginUser: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);

    if (!errors.isEmpty()) {    
        return next(HTTPException.rMalformed(errors));
    }

    const { username, password }: SBody = req.body;

    try {
        const foundUser: IUser | null = await User.findOne({ username });
        if (!foundUser) {
            next(HTTPException.rAuth());
        } else {
            const pwdValid: boolean = await bcrypt.compare(password, foundUser.password);
            if (!pwdValid) {
                next(HTTPException.rAuth());
            } else {
                foundUser.lastLogin = new Date().getTime();
                await foundUser.save();
                const token: string | null = getToken({ userId: foundUser._id });
                if (token) {
                    res.status(200).json({
                        token,
                        _id: foundUser._id
                    });
                } else {
                    next(HTTPException.rInternal('jwt token could not be generated'));
                }
            }
        }
    } catch(err) {
        next(HTTPException.rInternal(err));
    }
};

export const deleteUser: EMiddleware = async (req, res, next) => {
    try {
        const foundUser: IUser | null = await User.findById(req.userData.userId);
        if (!foundUser) {
            next(HTTPException.rAuth());
        } else {
            // make all deletions in the same sessions, so if any error occurs
            // we can roll back to the state before the deletion commenced.

            const session: ClientSession = await startSession();
            session.startTransaction();

            await foundUser.remove();
            await Board.deleteMany({ owner: foundUser._id });

            // TODO remove lists
            //await List.deleteMany({ indirectOwner: foundUser._id });

            // TODO remove cards
            //await Card.deleteMany({ indirectOwner: foundUser._id });

            // TODO remove checklists
            //await CheckList.deleteMany({ indirectOwner: foundUser._id });

            // TODO commit changes
            await session.commitTransaction();

            // return the deleted user with a 200 response
            res.status(200).json({message: `user ${foundUser.username} successfully deleted`});
        }
    } catch(err) {
        next(HTTPException.rInternal(err));
    }
};

export const changeUserPassword: EMiddleware = async (req, res, next) => {
    // TODO
}