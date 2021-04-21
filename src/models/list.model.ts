import { Schema, Types, model } from 'mongoose';

import { IBoard } from './board.model';
import { ICard } from './card.model';
import { IUser } from './user.model';
import { BaseDoc, IndirectRelation, ModelName } from '../util';

export interface IList extends BaseDoc, IndirectRelation<IUser> {
    owner: IBoard['_id'];
    cards: Array<ICard['_id']>;
    cardOrder: string[];
}

const listSchema: Schema = new Schema({
    name: { type: String, required: true },
    owner: { type: Types.ObjectId, required: true, ref: ModelName.Board },
    indirectOwner: { type: Types.ObjectId, required: true, ref: ModelName.User },
    cards: { type: [Types.ObjectId], required: true, ref: ModelName.Card },
    cardOrder: { type: [String], required: true },
    createdOn: { type: Number, required: true },
    updatedOn: { type: Number, required: true }
});

export default model<IList>(ModelName.List, listSchema);
