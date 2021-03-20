import { validationResult, Result, ValidationError } from 'express-validator';
import { startSession, ClientSession } from 'mongoose';

import User from '../models/user.model';
import Board, { IBoard } from '../models/board.model';
import List, { IList } from '../models/list.model';
import Card, { ICard } from '../models/card.model';
import Checklist from '../models/checklist.model';
import HTTPException from '../models/exception.model';
import { EMiddleware, SBody, ModelName, CollectionName, cmp } from '../util';

export const createBoard: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);
    // verify request body
    if (!errors.isEmpty()) {
        return next(HTTPException.rMalformed(errors));
    }
    // extract request data from body
    const { color, name }: SBody = req.body;
    try {
        const ts: number = new Date().getTime();
        const newBoard: IBoard = new Board({
            color,
            name,
            owner: req.userData.userId,
            lists: [],
            order: [],
            createdOn: ts,
            updatedOn: ts
        });
        // start transaction and attempt to save changes
        const session: ClientSession = await startSession();
        session.startTransaction();
        // save the new board
        await newBoard.save({ session });
        // connect new board to user who created said board
        await User.findByIdAndUpdate(
            req.userData.userId,
            { $push: { [CollectionName.Board]: newBoard._id }, updatedOn: ts },
            { session }
        );
        // commit changes
        await session.commitTransaction();
        // return the created object in response
        res.status(201).json(newBoard.toObject());
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const getBoardsByUserId: EMiddleware = async (req, res, next) => {
    // extract request data from path
    const userId: string = req.params.userId;
    // verify that the requested userId fits the authenticated user
    // a user should only have access to boards they created themselves
    if (cmp(req.userData, userId)) {
        try {
            // find the boards
            const foundBoards: IBoard[] | null = await Board.find({ owner: req.userData.userId });
            if (foundBoards) {
                // return the found boards with a 200 response
                res.status(200).json(foundBoards.map((board) => board.toObject()));
            } else {
                next(HTTPException.rNotFound('userId does not match any existing user'));
            }
        } catch (err) {
            next(HTTPException.rInternal(err));
        }
    } else {
        next(HTTPException.rAuth('owner does not match authenticated user'));
    }
};

export const getBoardByBoardId: EMiddleware = async (req, res, next) => {
    // extract request data from path
    const boardId: string = req.params.boardId;
    try {
        // find the board and populate the list and list.card fields
        // so only a single request have to be sent, to show an entire board
        const foundBoard: IBoard | null = await Board.findById(boardId).populate({
            path: CollectionName.List,
            model: ModelName.List,
            populate: {
                path: CollectionName.Card,
                model: ModelName.Card
            }
        });
        if (foundBoard) {
            if (cmp(req.userData, foundBoard.owner)) {
                // return the found board with a 200 response
                res.status(200).json(foundBoard.toObject());
            } else {
                next(HTTPException.rAuth('owner does not match authenticated user'));
            }
        } else {
            next(HTTPException.rNotFound('boardId does not match any existing board'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const updateBoardByBoardId: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);
    // verify request body
    if (!errors.isEmpty()) {
        return next(HTTPException.rMalformed(errors));
    }
    // extract request data from path and body
    const boardId: string = req.params.boardId;
    const { color, name }: SBody = req.body;
    const { order }: { [k: string]: string[] } = req.body;
    try {
        const updatedOn: number = new Date().getTime();
        const foundBoard: IBoard | null = await Board.findById(boardId);
        // verify requested board exists
        if (!foundBoard) {
            next(HTTPException.rNotFound());
            // verify that the user has access to the board
        } else if (cmp(req.userData, foundBoard.owner)) {
            // update the board
            foundBoard.color = color;
            foundBoard.name = name;
            foundBoard.order = order;
            foundBoard.updatedOn = updatedOn;
            // save changes
            await foundBoard.save();
            // return updated board with a 200 response
            res.status(200).json(foundBoard.toObject());
        } else {
            next(HTTPException.rAuth('incorrect token for desired action'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const deleteBoardByBoardId: EMiddleware = async (req, res, next) => {
    // extract request data from path
    const boardId: string = req.params.boardId;
    try {
        const foundBoard: IBoard | null = await Board.findById(boardId);
        // verify that requested board exists
        if (!foundBoard) {
            next(HTTPException.rNotFound('board could not be found from boardId'));
            // verify that the user has access to the board
        } else if (cmp(req.userData, foundBoard.owner)) {
            const updatedOn: number = new Date().getTime();
            // start transaction and attempt to make changes
            const session: ClientSession = await startSession();
            session.startTransaction();
            // remove board from user
            await User.findByIdAndUpdate(
                req.userData.userId,
                { $pull: { [CollectionName.Board]: foundBoard._id }, updatedOn },
                { session }
            );
            // find all lists under the board
            const foundLists: IList[] | null = await List.find({ owner: foundBoard._id }, null, { session });
            // iterate over each found list
            foundLists.forEach(async (foundList: IList) => {
                const foundCards: ICard[] | null = await Card.find({ owner: foundList._id }, null, { session });
                // iterate over each found card
                foundCards.forEach(async (foundCard: ICard) => {
                    // remove related checklists
                    await Checklist.bulkWrite(
                        [
                            {
                                deleteMany: {
                                    filter: { owner: foundCard._id }
                                }
                            }
                        ],
                        { session }
                    );
                });
                // remove related cards
                await Card.bulkWrite(
                    [
                        {
                            deleteMany: {
                                filter: { owner: foundList._id }
                            }
                        }
                    ],
                    { session }
                );
            });
            // after cards and checklists are removed under a list, remove the list itself
            await List.bulkWrite(
                [
                    {
                        deleteMany: {
                            filter: { owner: foundBoard._id }
                        }
                    }
                ],
                { session }
            );
            // remove the board itself
            await foundBoard.remove({ session });
            // commit changes
            await session.commitTransaction();
            // return the deleted board with a 200 response
            res.status(200).json({ message: `board ${foundBoard.name} successfully deleted` });
        } else {
            next(HTTPException.rAuth('incorrect token for desired action'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};
