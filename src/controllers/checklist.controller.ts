import { validationResult, Result, ValidationError } from 'express-validator';
import { startSession, ClientSession } from 'mongoose';

import Card, { ICard } from '../models/card.model';
import Checklist, { IChecklist } from '../models/checklist.model';
import HTTPException from '../models/exception.model';
import { RULE, EMiddleware, SBody, CollectionName, OrderName, cmp, validateBody } from '../util';

export const createChecklist: EMiddleware = async (req, res, next) => {
    const errors: Result<ValidationError> = validationResult(req);
    // verify request body
    if (!errors.isEmpty()) {
        return next(HTTPException.rMalformed(errors));
    }
    // extract request data from body
    const { owner, objective, isCompleted }: SBody = req.body;
    try {
        const owningCard: ICard | null = await Card.findById(owner);
        // verify that the owning card exists
        if (owningCard) {
            // verify that the user has access to the card where the checklist should be tied to
            if (cmp(req.userData, owningCard.indirectOwner)) {
                const ts: number = new Date().getTime();
                const newChecklist: IChecklist = new Checklist({
                    objective,
                    isCompleted,
                    owner: owningCard._id,
                    indirectOwner: req.userData.userId,
                    createdOn: ts,
                    updatedOn: ts
                });
                // add checklist to owning card
                owningCard[CollectionName.Checklist].push(newChecklist._id);
                owningCard[OrderName.Checklist].push(newChecklist._id);
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

export const updateChecklistByChecklistId: EMiddleware = async (req, res, next) => {
    // extract request data from path and body
    const checklistId: string = req.params.checklistId;
    const { objective, isCompleted }: { objective?: string; isCompleted?: boolean } = req.body;
    try {
        const updatedOn: number = new Date().getTime();
        const foundChecklist: IChecklist | null = await Checklist.findById(checklistId);
        // verify that the requested checklist exists
        if (!foundChecklist) {
            next(HTTPException.rNotFound('checklistId does not match any existing checklist'));
            // verify that the user has access to the checklist
        } else if (cmp(req.userData, foundChecklist.indirectOwner)) {
            // validate objective length
            if (!validateBody([objective, 1, RULE.CHK_OBJ_MAX_LEN])) {
                next(HTTPException.rMalformed());
            } else {
                // perform updates to the checklist
                foundChecklist.objective = objective ? objective : foundChecklist.objective;
                foundChecklist.isCompleted =
                    typeof isCompleted === 'boolean' ? isCompleted : foundChecklist.isCompleted;
                foundChecklist.updatedOn = updatedOn;
                await foundChecklist.save();
                res.status(200).json(foundChecklist.toObject());
            }
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
                        [CollectionName.Checklist]: foundChecklist._id,
                        [OrderName.Checklist]: foundChecklist._id
                    },
                    updatedOn
                },
                { session }
            );
            // remove the checklist itself
            await foundChecklist.remove({ session });
            // commit changes
            await session.commitTransaction();
            // return the deleted checklist with 200 response
            res.status(200).json(foundChecklist.toObject());
        } else {
            next(HTTPException.rAuth('incorrect token for desired action'));
        }
    } catch (err) {
        next(HTTPException.rInternal(err));
    }
};
