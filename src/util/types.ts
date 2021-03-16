import { Request, Response, NextFunction } from 'express';
import { Result, ValidationError } from 'express-validator';
import { Document } from "mongoose";


export interface BaseDoc extends Document {
    name         : string;
    createdOn    : number;
    updatedOn    : number;
};

export interface IndirectRelation<T extends BaseDoc> {
    indirectOwner: T['_id'];
};

export enum ModelName {
    User      = 'User',
    Board     = 'Board',
    List      = 'List',
    Card      = 'Card',
    CheckList = 'CheckList'
};

export enum CollectionName {
    User      = 'users',
    Board     = 'boards',
    List      = 'lists',
    Card      = 'cards',
    CheckList = 'checklists',
};

export interface SBody {
    [key: string]: string
};

export interface TokenData {
    userId: string
};

export type DevError = string | Result<ValidationError>;

export type EMiddleware = (req: Request, res: Response, next: NextFunction) => void;

export interface ErrorResponseContent {
    message: string,
    dev   ?: DevError
};

