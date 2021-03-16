import { Schema, Types, model } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator'

import { IBoard } from './board.model';
import { BaseDoc, ModelName } from '../util';


export interface IUser extends BaseDoc {
    username : string,
    password : string,
    boards   : Array<IBoard['_id']>,
    lastLogin: number
};

const userSchema: Schema = new Schema({
    name     : { type: String,             required: false },
    username : { type: String,             required: true, unique: true },
    password : { type: String,             required: true },
    boards   : { type: [ Types.ObjectId ], required: true, ref: ModelName.Board },
    createdOn: { type: Number,             required: true },
    updatedOn: { type: Number,             required: true },
    lastLogin: { type: Number,             required: true }
});

// validate uniqueness of username
userSchema.plugin(uniqueValidator);


export default model<IUser>(ModelName.User, userSchema);