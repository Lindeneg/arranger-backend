import { validationResult, Result, ValidationError } from 'express-validator';
import { startSession, ClientSession } from 'mongoose';

import User from '../models/user.model';
import Board, { IBoard } from '../models/board.model';
import HTTPException from '../models/exception.model';
import { EMiddleware, SBody, ModelName, CollectionName, cmp } from '../util';


export const createBoard: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);

    if (!errors.isEmpty()) {    
        return next(HTTPException.rMalformed(errors));
    }

    const { color, name }: SBody = req.body;
    
    try {
        const ts      : number = new Date().getTime();
        const newBoard: IBoard = new Board({
            color,
            name,
            owner    : req.userData.userId,
            lists    : [],
            createdOn: ts,
            updatedOn: ts
        });
        const session: ClientSession = await startSession();
        session.startTransaction();
        await newBoard.save({ session });
        await User.findByIdAndUpdate(req.userData.userId, { $push: { [CollectionName.Board]: newBoard._id }, updatedOn: ts}, { session });
        await session.commitTransaction();
        res.status(201).json(newBoard.toObject());
    } catch(err) {
        next(HTTPException.rInternal(err));
    }
};


export const getBoardsByUserId: EMiddleware = async (req, res, next) => {
    const userId: string = req.params.userId;
    if (cmp(req.userData, userId)) {
        try {
            const foundBoards: IBoard[] | null = await Board.find({ owner: req.userData.userId });
            if (foundBoards) {
                res.status(200).json(foundBoards.map(board => board.toObject()));
            } else {
                next(HTTPException.rNotFound('userId does not match any existing user'));
            }
        } catch(err) {
            next(HTTPException.rInternal(err));
        }
    } else {
        next(HTTPException.rAuth('owner does not match authenticated user'));
    }
};

export const getBoardByBoardId: EMiddleware = async (req, res, next) => {
    const boardId: string = req.params.boardId;
    try {
        const foundBoard: IBoard | null = await Board.findById(boardId).populate({
            path: CollectionName.List, 
            model: ModelName.List
        });
        if (foundBoard) {
            if (cmp(req.userData, foundBoard.owner)) {
                res.status(200).json(foundBoard.toObject());
            } else {
                next(HTTPException.rAuth('owner does not match authenticated user'));
            }
        } else {
            next(HTTPException.rNotFound('boardId does not match any existing board'));
        }
    } catch(err) {
        next(HTTPException.rInternal(err));
    }
};

export const updateBoardByBoardId: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);

    if (!errors.isEmpty()) {    
        return next(HTTPException.rMalformed(errors));
    }

    const boardId        : string        = req.params.boardId;
    const { color, name }: SBody         = req.body;

    try {
        const updatedOn  : number        = new Date().getTime();
        const foundBoard : IBoard | null = await Board.findById(boardId); 
        if (!foundBoard) {
            next(HTTPException.rNotFound())
        } else if (cmp(req.userData, foundBoard.owner)) {
            foundBoard.color = color; foundBoard.name = name; foundBoard.updatedOn = updatedOn;
            await foundBoard.save();
            res.status(200).json(foundBoard.toObject());
        } else {
            next(HTTPException.rAuth('incorrect token for desired action'));
        }
    } catch(err) {
        next(HTTPException.rInternal(err));
    }
};

export const deleteBoardByBoardId: EMiddleware = async (req, res, next) => {
    const boardId: string = req.params.boardId;
    try {
        const foundBoard: IBoard | null = await Board.findById(boardId);
        if (!foundBoard) {
            next(HTTPException.rNotFound('board could not be found from boardId'));
        } else if (cmp(req.userData, foundBoard.owner)) {
            const updatedOn: number = new Date().getTime();

            // make all deletions in the same sessions, so if any error occurs
            // we can roll back to the state before the deletion commenced.
            const session: ClientSession = await startSession();
            session.startTransaction();

            // remove board from user
            await User.findByIdAndUpdate(req.userData.userId, { $pull: { [CollectionName.Board]: foundBoard._id }, updatedOn }, { session });

            // TODO find all lists under the board

                // TODO find all cards under each list

                        // TODO find all checklists under each card

            // remove the board itself
            await foundBoard.remove({ session });

            // commit changes
            await session.commitTransaction();

            // return the deleted board with a 200 response
            res.status(200).json({message: `board ${foundBoard.name} successfully deleted`});
        } else {
            next(HTTPException.rAuth('incorrect token for desired action'));
        }
    } catch(err) {
        next(HTTPException.rInternal(err));
    }
};