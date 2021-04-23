import { Schema, Types, model } from 'mongoose';

import { IUser } from './user.model';
import { IList } from './list.model';
import { BaseDoc, ModelName } from '../util/types';

export interface IBoard extends BaseDoc {
    owner: IUser['_id'];
    color: string;
    lists: Array<IList['_id']>;
    listOrder: string[];
}

const boardSchema: Schema = new Schema({
    color: { type: String, required: true },
    name: { type: String, required: true },
    owner: { type: Types.ObjectId, required: true, ref: ModelName.User },
    lists: { type: [Types.ObjectId], required: true, ref: ModelName.List },
    listOrder: { type: [String], required: true },
    createdOn: { type: Number, required: true },
    updatedOn: { type: Number, required: true }
});

export default model<IBoard>(ModelName.Board, boardSchema);
