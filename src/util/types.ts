import { Request, Response, NextFunction } from 'express';
import { Result, ValidationError } from 'express-validator';
import { Document } from 'mongoose';

export interface BaseDoc extends Document {
    name: string;
    createdOn: number;
    updatedOn: number;
}

export interface Orderable {
    order: string[];
}

export interface IndirectRelation<T extends BaseDoc> {
    indirectOwner: T['_id'];
}

export interface ErrorResponseContent {
    message: string;
    dev?: DevError;
}

export interface SBody<T = string> {
    [key: string]: T;
}

export interface TokenData {
    userId: string;
}

export type CardColorOption =
    | 'blue'
    | 'gray'
    | 'green'
    | 'red'
    | 'yellow'
    | 'teal'
    | 'light'
    | 'dark';

export type ThemeOption = 'light' | 'dark';

export enum ModelName {
    User = 'User',
    Board = 'Board',
    List = 'List',
    Card = 'Card',
    Checklist = 'Checklist'
}

export enum CollectionName {
    User = 'users',
    Board = 'boards',
    List = 'lists',
    Card = 'cards',
    Checklist = 'checklists'
}

export enum OrderName {
    List = 'listOrder',
    Card = 'cardOrder',
    Checklist = 'checklistOrder'
}

export type DevError = string | Result<ValidationError>;
export type EMiddleware = (req: Request, res: Response, next: NextFunction) => void;
