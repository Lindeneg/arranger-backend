import { Schema, Types, model } from 'mongoose';

import { IUser } from './user.model';
import { IList } from './list.model';
import { BaseDoc, ModelName } from '../util/types';


export interface IBoard extends BaseDoc {
    color: string;
    owner: IUser['_id'];
    lists: Array<IList['_id']>;
};

const boardSchema: Schema = new Schema({
    color    : { type: String,             required: true },
    name     : { type: String,             required: true },
    owner    : { type: Types.ObjectId,     required: true, ref: ModelName.User },
    lists    : { type: [ Types.ObjectId ], required: true, ref: ModelName.List },
    createdOn: { type: Number,             required: true },
    updatedOn: { type: Number,             required: true },
});


export default model<IBoard>(ModelName.Board, boardSchema);