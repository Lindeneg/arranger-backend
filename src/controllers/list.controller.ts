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
                const ts     : number = new Date().getTime();
                const newList: IList  = new List({
                    name,
                    owner        : owningBoard._id,
                    cards        : [],
                    indirectOwner: req.userData.userId,
                    createdOn    : ts,
                    updatedOn    : ts
                });
                // add list to owning board
                owningBoard.lists.push(newList._id);
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
    } catch(err) {
        next(HTTPException.rInternal(err));
    }
};


export const getListsByBoardId: EMiddleware = async (req, res, next) => {
    // extract request data from path
    const boardId: string = req.params.boardId;
    try {
        const foundBoard: IBoard | null  = await Board.findById(boardId);
        // verify that the owning board exists
        if (foundBoard) {
            // verify that the user has access to the board and therefore the lists under said board
            if (cmp(req.userData, foundBoard.owner)) {
                const foundLists: IList[] | null = await List.find({ owner: foundBoard._id });
                if (foundLists) {
                    res.status(200).json(foundLists.map(list => list.toObject()));
                } else {
                    next(HTTPException.rNotFound('no lists could be extracted from board'));
                }
            } else {
                next(HTTPException.rAuth('owner does not match authenticated user'));
            }
        } else {
            next(HTTPException.rNotFound('owning board could not be found'));
        }
    } catch(err) {
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
    } catch(err) {
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
    const listId  : string = req.params.listId;
    const { name }: SBody  = req.body;
    try {
        const updatedOn  : number        = new Date().getTime();
        const foundList  : IList | null  = await List.findById(listId); 
        // verify that the requested list exists
        if (!foundList) {
            next(HTTPException.rNotFound())
        } else if (cmp(req.userData, foundList.indirectOwner)) {
            // perform updates to the list
            foundList.name = name; foundList.updatedOn = updatedOn;
            await foundList.save();
            res.status(200).json(foundList.toObject());
        } else {
            next(HTTPException.rAuth('incorrect token for desired action'));
        }
    } catch(err) {
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
            // find all cards under the list
            const foundCards: ICard[] | null = await Card.find( { owner: foundList._id }, { session });
            // iterate over each found card
            foundCards.forEach(async (foundCard: ICard) => {
                // delete all checklists under each card
                await Checklist.deleteMany({ owner: foundCard._id }, { session });
                // delete the card itself
                await foundCard.remove({ session });
            });
            // remove list from board
            await Board.findByIdAndUpdate(foundList.owner, { $pull: { [CollectionName.List]: foundList._id }, updatedOn }, { session });
            // remove the list itself
            await foundList.remove({ session });
            // commit changes
            await session.commitTransaction();
            // return name of deleted list with a 200 response
            res.status(200).json({message: `list ${foundList.name} successfully deleted`});
        } else {
            next(HTTPException.rAuth('incorrect token for desired action'));
        }
    } catch(err) {
        next(HTTPException.rInternal(err));
    }
};