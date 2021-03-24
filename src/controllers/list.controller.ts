import { validationResult, Result, ValidationError } from 'express-validator';
import { startSession, ClientSession } from 'mongoose';

import Board, { IBoard } from '../models/board.model';
import List, { IList } from '../models/list.model';
import Card, { ICard } from '../models/card.model';
import Checklist from '../models/checklist.model';
import HTTPException from '../models/exception.model';
import { EMiddleware, SBody, ModelName, CollectionName, cmp } from '../util';

export const createList: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);
    // verify request body
    if (!errors.isEmpty()) {
        return next(HTTPException.rMalformed(errors));
    }
    // extract request data from body
    const { name, owner }: SBody = req.body;
    try {
        const owningBoard: IBoard | null = await Board.findById(owner);
        // verify that the owning board exists
        if (owningBoard) {
            // verify that the user has access to the board where the list should be tied to
            if (cmp(req.userData, owningBoard.owner)) {
                const ts: number = new Date().getTime();
                const newList: IList = new List({
                    name,
                    owner: owningBoard._id,
                    cards: [],
                    order: [],
                    indirectOwner: req.userData.userId,
                    createdOn: ts,
                    updatedOn: ts
                });
                // add list to owning board
                owningBoard[CollectionName.List].push(newList._id);
                owningBoard[CollectionName.Order].push(newList._id);
                // update owning board updatedOn
                owningBoard.updatedOn = ts;
                // start transaction and attempt to save changes
                const session: ClientSession = await startSession();
                session.startTransaction();
                await newList.save({ session });
                await owningBoard.save({ session });
                // commit changes
                await session.commitTransaction();
                // return the created object in response
                res.status(201).json(newList.toObject());
            } else {
                next(HTTPException.rAuth('owner does not match authenticated user'));
            }
        } else {
            next(HTTPException.rNotFound('owning board could not be found'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const getListsByBoardId: EMiddleware = async (req, res, next) => {
    // extract request data from path
    const boardId: string = req.params.boardId;
    try {
        const foundBoard: IBoard | null = await Board.findById(boardId);
        // verify that the owning board exists
        if (foundBoard) {
            // verify that the user has access to the board and therefore the lists under said board
            if (cmp(req.userData, foundBoard.owner)) {
                const foundLists: IList[] | null = await List.find({ owner: foundBoard._id });
                if (foundLists) {
                    res.status(200).json(foundLists.map((list) => list.toObject()));
                } else {
                    next(HTTPException.rNotFound('no lists could be extracted from board'));
                }
            } else {
                next(HTTPException.rAuth('owner does not match authenticated user'));
            }
        } else {
            next(HTTPException.rNotFound('owning board could not be found'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const getListByListId: EMiddleware = async (req, res, next) => {
    // extract request data from path
    const listId: string = req.params.listId;
    try {
        // find the list and populate the card and checklist models
        const foundList: IList | null = await List.findById(listId).populate({
            path: CollectionName.Card,
            model: ModelName.Card,
            populate: {
                path: CollectionName.Checklist,
                model: ModelName.Checklist
            }
        });
        if (foundList) {
            if (cmp(req.userData, foundList.indirectOwner)) {
                res.status(200).json(foundList.toObject());
            } else {
                next(HTTPException.rAuth('owner does not match authenticated user'));
            }
        } else {
            next(HTTPException.rNotFound('listId does not match any existing list'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const updateListByListId: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);
    // verify request body
    if (!errors.isEmpty()) {
        return next(HTTPException.rMalformed(errors));
    }
    // extract request data from path and body
    const listId: string = req.params.listId;
    const { name }: SBody = req.body;
    try {
        const updatedOn: number = new Date().getTime();
        const foundList: IList | null = await List.findById(listId);
        // verify that the requested list exists
        if (!foundList) {
            next(HTTPException.rNotFound());
        } else if (cmp(req.userData, foundList.indirectOwner)) {
            // perform updates to the list
            foundList.name = name;
            foundList.updatedOn = updatedOn;
            await foundList.save();
            res.status(200).json(foundList.toObject());
        } else {
            next(HTTPException.rAuth('incorrect token for desired action'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const updateListCardOrder: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);
    // verify request body
    if (!errors.isEmpty()) {
        return next(HTTPException.rMalformed(errors));
    }
    // extract request data from body
    const { srcListId, desListId, cardId }: SBody = req.body;
    const { srcListOrder, desListOrder }: SBody<string[]> = req.body;
    try {
        const updatedOn: number = new Date().getTime();
        const srcList: IList | null = await List.findById(srcListId);
        // verify source exists
        if (srcList) {
            // verify user has access to source
            if (!cmp(req.userData, srcList.indirectOwner)) {
                return next(HTTPException.rAuth('src list is inaccessible'));
            }
            const session: ClientSession = await startSession();
            session.startTransaction();
            // the source list should always have its card order updated
            await srcList.updateOne({ order: srcListOrder, updatedOn }, { session });
            // if the source and destination lists are not equal
            // we need to update the destination as well
            if (srcListId !== desListId) {
                const desList: IList | null = await List.findById(desListId, null, { session });
                // verify destination exists
                if (desList) {
                    // verify user has access to destination
                    if (!cmp(req.userData, desList.indirectOwner)) {
                        return next(HTTPException.rAuth('des list is inaccessible'));
                    }
                    // a card must have changed owner when the source and destination are not equal
                    const card: ICard | null = await Card.findById(cardId, null, { session });
                    // verify card exists
                    if (card) {
                        // verify user has access to card
                        if (!cmp(req.userData, card.indirectOwner)) {
                            return next(HTTPException.rAuth('card is inaccessible'));
                        }
                        // pull the card from the source list
                        await srcList.updateOne({ $pull: { [CollectionName.Card]: cardId } }, { session });
                        // add the card to the destination list and update the card order
                        await desList.updateOne(
                            {
                                $push: { [CollectionName.Card]: cardId },
                                order: desListOrder,
                                updatedOn
                            },
                            { session }
                        );
                        // update the card owner
                        await card.updateOne({ owner: desList._id, updatedOn }, { session });
                    } else {
                        return next(HTTPException.rNotFound('card not found'));
                    }
                } else {
                    return next(HTTPException.rNotFound('des list not found'));
                }
            }
            // commit the changes
            await session.commitTransaction();
            res.status(201).json({ message: 'entries successfully updated' });
        } else {
            next(HTTPException.rNotFound('src list not found'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const deleteListByListId: EMiddleware = async (req, res, next) => {
    // extract request data from path
    const listId: string = req.params.listId;
    try {
        const foundList: IList | null = await List.findById(listId);
        // verify that the requested list exists
        if (!foundList) {
            next(HTTPException.rAuth());
            // verify that the user has access to the list
        } else if (cmp(req.userData, foundList.indirectOwner)) {
            const updatedOn: number = new Date().getTime();
            // start transaction and attempt to make changes
            const session: ClientSession = await startSession();
            session.startTransaction();
            // remove list reference from board
            await Board.findByIdAndUpdate(
                foundList.owner,
                { $pull: { [CollectionName.List]: foundList._id, [CollectionName.Order]: foundList._id }, updatedOn },
                { session }
            );
            // find all cards under the list
            const foundCards: ICard[] | null = await Card.find({ owner: foundList._id }, null, { session });
            // iterate over each found card
            foundCards.forEach(async (foundCard: ICard) => {
                // remove related checklists under iterated card
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
            // remove all cards under list
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
            // finally remove the list itself
            await foundList.remove({ session });
            // commit changes
            await session.commitTransaction();
            // return name of deleted list with a 200 response
            res.status(200).json({ message: `list ${foundList.name} successfully deleted` });
        } else {
            next(HTTPException.rAuth('incorrect token for desired action'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};
