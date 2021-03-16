import { Schema, Types, model } from 'mongoose';

import { IList } from './list.model';
import { ICheckList } from './checklist.model';
import { IUser } from './user.model';
import { BaseDoc, IndirectRelation, ModelName } from '../util/types';


export interface ICard extends BaseDoc, IndirectRelation<IUser> {
    description: string;
    color      : string;
    owner      : IList['_id'];
    checkLists : Array<ICheckList['_id']>;
};

const cardSchema: Schema = new Schema({
    name         : { type: String,             required: true },
    description  : { type: String,             required: true },
    color        : { type: String,             required: true },
    owner        : { type: Types.ObjectId,     required: true, ref: ModelName.List },
    indirectOwner: { type: Types.ObjectId,     required: true, ref: ModelName.User },
    checkLists   : { type: [ Types.ObjectId ], required: true, ref: ModelName.CheckList },
    createdOn    : { type: Number,             required: true },
    updatedOn    : { type: Number,             required: true },
});


export default model<ICard>(ModelName.Card, cardSchema);