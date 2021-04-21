import { Schema, Types, model } from 'mongoose';

import { ICard } from './card.model';
import { IUser } from './user.model';
import { BaseDoc, IndirectRelation, ModelName } from '../util/types';

export interface IChecklist extends BaseDoc, IndirectRelation<IUser> {
    objective: string;
    isCompleted: boolean;
    owner: ICard['_id'];
}

const checklistSchema: Schema = new Schema({
    objective: { type: String, required: true },
    isCompleted: { type: Boolean, required: true },
    owner: { type: Types.ObjectId, required: true, ref: ModelName.Card },
    indirectOwner: { type: Types.ObjectId, required: true, ref: ModelName.User },
    createdOn: { type: Number, required: true },
    updatedOn: { type: Number, required: true }
});

export default model<IChecklist>(ModelName.Checklist, checklistSchema);
