import { validationResult, Result, ValidationError } from 'express-validator';
import { startSession, ClientSession } from 'mongoose';

import Card, { ICard } from '../models/card.model';
import List, { IList } from '../models/list.model';
import Checklist from '../models/checklist.model';
import HTTPException from '../models/exception.model';
import { EMiddleware, SBody, ModelName, CollectionName, cmp } from '../util';

export const createCard: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);
    // verify request body
    if (!errors.isEmpty()) {
        return next(HTTPException.rMalformed(errors));
    }
    // extract request data from body
    const { name, owner, description, color }: SBody = req.body;
    try {
        const owningList: IList | null = await List.findById(owner);
        if (owningList) {
            // verify that the user has access to the list where the card should be tied to
            if (cmp(req.userData, owningList.indirectOwner)) {
                const ts: number = new Date().getTime();
                const newCard: ICard = new Card({
                    name,
                    description,
                    color,
                    checklists: [],
                    owner: owningList._id,
                    indirectOwner: req.userData.userId,
                    createdOn: ts,
                    updatedOn: ts
                });
                // add card to owning list
                owningList[CollectionName.Card].push(newCard._id);
                owningList[CollectionName.Order].push(newCard._id);
                // update owning list updatedOn
                owningList.updatedOn = ts;
                // start transaction and attempt to save changes
                const session: ClientSession = await startSession();
                session.startTransaction();
                await newCard.save({ session });
                await owningList.save({ session });
                // commit changes
                await session.commitTransaction();
                // return the created object in response
                res.status(201).json(newCard.toObject());
            } else {
                next(HTTPException.rAuth('owner does not match authenticated user'));
            }
        } else {
            next(HTTPException.rNotFound('owning list could not be found'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const getCardsByListId: EMiddleware = async (req, res, next) => {
    const listId: string = req.params.listId;
    try {
        // find the list where all cards should be returned from
        const foundList: IList | null = await List.findById(listId);
        if (foundList) {
            // verify that the user has access to the list and therefore cards under that list
            if (cmp(req.userData, foundList.indirectOwner)) {
                const foundCards: ICard[] | null = await Card.find({ owner: foundList._id });
                if (foundCards) {
                    res.status(200).json(foundCards.map((card) => card.toObject()));
                } else {
                    next(HTTPException.rNotFound('no cards could be extracted from list'));
                }
            } else {
                next(HTTPException.rAuth('owner does not match authenticated user'));
            }
        } else {
            next(HTTPException.rNotFound('owning list could not be found'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const getCardByCardId: EMiddleware = async (req, res, next) => {
    const cardId: string = req.params.cardId;
    try {
        // find the card and populate the checklist model in the card
        const foundCard: ICard | null = await Card.findById(cardId).populate({
            path: CollectionName.Checklist,
            model: ModelName.Checklist
        });
        if (foundCard) {
            // verify that the user has access to the card
            if (cmp(req.userData, foundCard.indirectOwner)) {
                res.status(200).json(foundCard.toObject());
            } else {
                next(HTTPException.rAuth('owner does not match authenticated user'));
            }
        } else {
            next(HTTPException.rNotFound('cardId does not match any existing card'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const updateCardByCardId: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);
    // verify request body
    if (!errors.isEmpty()) {
        return next(HTTPException.rMalformed(errors));
    }
    // extract request data from path and body
    const cardId: string = req.params.cardId;
    const { name, description, color, owner }: SBody = req.body;
    try {
        const updatedOn: number = new Date().getTime();
        const foundCard: ICard | null = await Card.findById(cardId).populate({
            path: CollectionName.Checklist,
            model: ModelName.Checklist
        });
        // find the card that should be updated
        if (!foundCard) {
            next(HTTPException.rNotFound());
            // verify that the user has access to card
        } else if (cmp(req.userData, foundCard.indirectOwner)) {
            // check if we're updating the owning list
            if (owner.toString() !== foundCard.owner.toString()) {
                // verify that the new owner exists
                const newOwner: IList | null = await List.findById(owner);
                if (newOwner) {
                    // update the owner
                    foundCard.owner = newOwner._id;
                } else {
                    // trying to set invalid owner
                    return next(HTTPException.rNotFound('new owner not found'));
                }
            }
            // update the card
            foundCard.name = name;
            foundCard.description = description;
            foundCard.color = color;
            foundCard.updatedOn = updatedOn;
            // save the changes
            await foundCard.save();
            // return the updated object with a 200 response
            res.status(200).json(foundCard.toObject());
        } else {
            next(HTTPException.rAuth('incorrect token for desired action'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const deleteCardByCardId: EMiddleware = async (req, res, next) => {
    const cardId: string = req.params.cardId;
    try {
        const foundCard: ICard | null = await Card.findById(cardId);
        if (!foundCard) {
            next(HTTPException.rNotFound());
        } else if (cmp(req.userData, foundCard.indirectOwner)) {
            const updatedOn: number = new Date().getTime();
            // start transaction and attempt to make changes
            const session: ClientSession = await startSession();
            session.startTransaction();
            // remove card from owning list
            await List.findByIdAndUpdate(
                foundCard.owner,
                { $pull: { [CollectionName.Card]: foundCard._id, [CollectionName.Order]: foundCard._id }, updatedOn },
                { session }
            );
            // remove checklists under card
            await Checklist.deleteMany({ owner: foundCard._id }, { session });
            // remove the card itself
            await foundCard.remove({ session });
            // commit changes
            await session.commitTransaction();
            // return name of deleted card with a 200 response
            res.status(200).json({ message: `card ${foundCard.name} successfully deleted` });
        } else {
            next(HTTPException.rAuth('incorrect token for desired action'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};
