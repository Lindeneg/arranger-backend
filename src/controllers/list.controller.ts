import { validationResult, Result, ValidationError } from 'express-validator';
import { startSession, ClientSession } from 'mongoose';

import Board, { IBoard } from '../models/board.model';
import List, { IList } from '../models/list.model';
import Card, { ICard } from '../models/card.model';
import Checklist from '../models/checklist.model';
import HTTPException from '../models/exception.model';
import { EMiddleware, SBody, CollectionName, OrderName, cmp, getUpdatedCardOrder } from '../util';

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
                    cardOrder: [],
                    indirectOwner: req.userData.userId,
                    createdOn: ts,
                    updatedOn: ts
                });
                // add list to owning board
                owningBoard[CollectionName.List].push(newList._id);
                owningBoard[OrderName.List].push(newList._id);
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
            // verify user has access to list
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
    const { srcId, desId, targetId }: SBody = req.body;
    const { srcIdx, desIdx }: SBody<number> = req.body;
    try {
        const updatedOn: number = new Date().getTime();
        const srcList: IList | null = await List.findById(srcId);
        const desList: IList | null = await List.findById(desId);
        // verify source exists
        if (srcList && desList) {
            // verify user has access to source
            if (!cmp(req.userData, srcList.indirectOwner)) {
                return next(HTTPException.rAuth('src list is inaccessible'));
            }
            const newOrders = getUpdatedCardOrder(
                targetId,
                srcId,
                srcIdx,
                srcList.cardOrder,
                desId,
                desIdx,
                desList.cardOrder
            );
            if (newOrders !== null) {
                const session: ClientSession = await startSession();
                session.startTransaction();
                // the source list should always have its card order updated
                await srcList.updateOne(
                    { [OrderName.Card]: newOrders.srcOrder, updatedOn },
                    { session }
                );
                // if the source and destination lists are not equal
                // we need to update the destination as well
                if (srcId !== desId) {
                    // verify destination exists
                    // verify user has access to destination
                    if (!cmp(req.userData, desList.indirectOwner)) {
                        return next(HTTPException.rAuth('des list is inaccessible'));
                    }
                    // a card must have changed owner when the source and destination are not equal
                    const card: ICard | null = await Card.findById(targetId, null, { session });
                    // verify card exists
                    if (card) {
                        // verify user has access to card
                        if (!cmp(req.userData, card.indirectOwner)) {
                            return next(HTTPException.rAuth('card is inaccessible'));
                        }
                        // pull the card from the source list
                        await srcList.updateOne(
                            { $pull: { [CollectionName.Card]: targetId } },
                            { session }
                        );
                        // add the card to the destination list and update the card order
                        await desList.updateOne(
                            {
                                $push: { [CollectionName.Card]: targetId },
                                [OrderName.Card]: newOrders.desOrder,
                                updatedOn
                            },
                            { session }
                        );
                        // update the card owner
                        await card.updateOne({ owner: desList._id, updatedOn }, { session });
                    } else {
                        return next(HTTPException.rNotFound('card not found'));
                    }
                }
                // commit the changes
                await session.commitTransaction();
                res.status(201).json({ message: 'order updated' });
            } else {
                next(HTTPException.rMalformed('could not get updated order'));
            }
        } else {
            next(HTTPException.rNotFound('list not found'));
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
                {
                    $pull: {
                        [CollectionName.List]: foundList._id,
                        [OrderName.List]: foundList._id
                    },
                    updatedOn
                },
                { session }
            );
            // find all cards under the list
            const foundCards: ICard[] | null = await Card.find({ owner: foundList._id }, null, {
                session
            });
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
            res.status(200).json(foundList.toObject());
        } else {
            next(HTTPException.rAuth('incorrect token for desired action'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};
