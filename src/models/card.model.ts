import { Schema, Types, model } from 'mongoose';

import { IList } from './list.model';
import { IChecklist } from './checklist.model';
import { IUser } from './user.model';
import { BaseDoc, IndirectRelation, ModelName } from '../util/types';


export interface ICard extends BaseDoc, IndirectRelation<IUser> {
    description  : string;
    color        : string;
    owner        : IList['_id'];
    checklists   : Array<IChecklist['_id']>;
};

const cardSchema: Schema = new Schema({
    name         : { type: String,             required: true },
    description  : { type: String,             required: true },
    color        : { type: String,             required: true },
    owner        : { type: Types.ObjectId,     required: true, ref: ModelName.List },
    indirectOwner: { type: Types.ObjectId,     required: true, ref: ModelName.User },
    checklists   : { type: [ Types.ObjectId ], required: true, ref: ModelName.Checklist },
    createdOn    : { type: Number,             required: true },
    updatedOn    : { type: Number,             required: true },
});


export default model<ICard>(ModelName.Card, cardSchema);