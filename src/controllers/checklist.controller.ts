import { validationResult, Result, ValidationError } from 'express-validator';
import { startSession, ClientSession } from 'mongoose';

import Card, { ICard } from '../models/card.model';
import Checklist, { IChecklist } from '../models/checklist.model';
import HTTPException from '../models/exception.model';
import { EMiddleware, SBody, CollectionName, cmp } from '../util';

export const createChecklist: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);
    // verify request body
    if (!errors.isEmpty()) {
        return next(HTTPException.rMalformed(errors));
    }
    // extract request data from body
    const { name, owner, description, isCompleted }: SBody = req.body;
    try {
        const owningCard: ICard | null = await Card.findById(owner);
        // verify that the owning card exists
        if (owningCard) {
            // verify that the user has access to the card where the checklist should be tied to
            if (cmp(req.userData, owningCard.indirectOwner)) {
                const ts: number = new Date().getTime();
                const newChecklist: IChecklist = new Checklist({
                    name,
                    description,
                    isCompleted,
                    owner: owningCard._id,
                    indirectOwner: req.userData.userId,
                    createdOn: ts,
                    updatedOn: ts
                });
                // add checklist to owning card
                owningCard[CollectionName.Checklist].push(newChecklist._id);
                // update owning card updatedOn
                owningCard.updatedOn = ts;
                // start transaction and attempt to save changes
                const session: ClientSession = await startSession();
                session.startTransaction();
                await newChecklist.save({ session });
                await owningCard.save({ session });
                // commit changes
                await session.commitTransaction();
                // return the created object in response
                res.status(201).json(newChecklist.toObject());
            } else {
                next(HTTPException.rAuth('owner does not match authenticated user'));
            }
        } else {
            next(HTTPException.rNotFound('owning card could not be found'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const getChecklistsByCardId: EMiddleware = async (req, res, next) => {
    // extract request data from path
    const cardId: string = req.params.cardId;
    try {
        const foundCard: ICard | null = await Card.findById(cardId);
        // verify that the requested card exists
        if (foundCard) {
            // verify that the user has access to the card where the checklist is from
            if (cmp(req.userData, foundCard.indirectOwner)) {
                const foundChecklists: IChecklist[] | null = await Checklist.find({ owner: foundCard._id });
                if (foundChecklists) {
                    res.status(200).json(foundChecklists.map((checklist) => checklist.toObject()));
                } else {
                    next(HTTPException.rUnprocessable('no checklists could be extracted from card'));
                }
            } else {
                next(HTTPException.rAuth('owner does not match authenticated user'));
            }
        } else {
            next(HTTPException.rNotFound('owning card could not be found'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const getChecklistByChecklistId: EMiddleware = async (req, res, next) => {
    // extract request data from path
    const checklistId: string = req.params.checklistId;
    try {
        const foundCheckList: IChecklist | null = await Checklist.findById(checklistId);
        // verify that the requested checklist exists
        if (foundCheckList) {
            // verify that the user has access to the checklist
            if (cmp(req.userData, foundCheckList.indirectOwner)) {
                res.status(200).json(foundCheckList.toObject());
            } else {
                next(HTTPException.rAuth('owner does not match authenticated user'));
            }
        } else {
            next(HTTPException.rNotFound('checklistId does not match any existing checklist'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const updateChecklistByChecklistId: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);
    // verify request body
    if (!errors.isEmpty()) {
        return next(HTTPException.rMalformed(errors));
    }
    // extract request data from path and body
    const checklistId: string = req.params.checklistId;
    const { name, description }: SBody = req.body;
    const { isCompleted }: SBody<boolean> = req.body;
    try {
        const updatedOn: number = new Date().getTime();
        const foundChecklist: IChecklist | null = await Checklist.findById(checklistId);
        // verify that the requested checklist exists
        if (!foundChecklist) {
            next(HTTPException.rNotFound('checklistId does not match any existing checklist'));
            // verify that the user has access to the checklist
        } else if (cmp(req.userData, foundChecklist.indirectOwner)) {
            // perform updates to the checklist
            foundChecklist.name = name;
            foundChecklist.description = description;
            foundChecklist.isCompleted = isCompleted;
            foundChecklist.updatedOn = updatedOn;
            await foundChecklist.save();
            res.status(200).json(foundChecklist.toObject());
        } else {
            next(HTTPException.rAuth('incorrect token for desired action'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};

export const deleteChecklistByChecklistId: EMiddleware = async (req, res, next) => {
    // extract request data from path
    const checklistId: string = req.params.checklistId;
    try {
        const foundChecklist: IChecklist | null = await Checklist.findById(checklistId);
        // verify that the requested checklist exists
        if (!foundChecklist) {
            next(HTTPException.rNotFound('checklistId does not match any existing checklist'));
            // verify that the user has access to the checklist
        } else if (cmp(req.userData, foundChecklist.indirectOwner)) {
            const updatedOn: number = new Date().getTime();
            // start transaction and attempt to make changes
            const session: ClientSession = await startSession();
            session.startTransaction();
            // remove checklist from card
            await Card.findByIdAndUpdate(
                foundChecklist.owner,
                {
                    $pull: {
                        [CollectionName.Checklist]: foundChecklist._id
                    },
                    updatedOn
                },
                { session }
            );
            // remove the checklist itself
            await foundChecklist.remove({ session });
            // commit changes
            await session.commitTransaction();
            // return name of deleted checklist with 200 response
            res.status(200).json({ message: `checklist ${foundChecklist.name} successfully deleted` });
        } else {
            next(HTTPException.rAuth('incorrect token for desired action'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};
