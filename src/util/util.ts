import jwt from 'jsonwebtoken';

import { TokenData } from './types';

// create a new jwt token
export const getToken = (pl: string | Record<string, unknown>): string | null => {
    if (typeof process.env.JWT_PRIVATE_TOKEN !== 'undefined') {
        return jwt.sign(pl, process.env.JWT_PRIVATE_TOKEN, { expiresIn: '6h' });
    }
    return null;
};

// verify a jwt token and return the decoded content
export const verifyToken = (token: string): TokenData | null => {
    try {
        if (typeof process.env.JWT_PRIVATE_TOKEN !== 'undefined') {
            const result: TokenData = jwt.verify(token, process.env.JWT_PRIVATE_TOKEN) as TokenData;
            if (typeof result === 'object') {
                return result;
            } else {
                isDebug() && console.log('unexpected token result: ' + result);
            }
        }
    } catch (err) {
        isDebug() && console.log(err);
    }
    return null;
};

// compare userId found in jwt payload with the target string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cmp = (tokenData: TokenData | undefined, target: string | any): boolean => {
    if (
        typeof tokenData !== 'undefined' &&
        typeof tokenData.userId !== 'undefined' &&
        typeof target !== 'undefined'
    ) {
        try {
            return tokenData.userId.toString() === target.toString();
        } catch (err) {
            isDebug() && console.log(`could not compare ${tokenData} with ${target}`);
        }
    }
    return false;
};

// check if we're running in dev mode
export const isDebug = (): boolean => process.env.NODE_ENV === 'development';

export const getUpdatedCardOrder = (
    targetId: string,
    srcId: string,
    srcIdx: number,
    srcOrder: string[],
    desId: string,
    desIdx: number,
    desOrder: string[]
): { srcOrder: string[]; desOrder: string[] } | null => {
    try {
        const newSrcCardOrder = [...srcOrder];
        const newDesCardOrder = [...desOrder];
        if (newSrcCardOrder[srcIdx].toString() === targetId.toString()) {
            const [orderTarget] = newSrcCardOrder.splice(srcIdx, 1);
            (srcId.toString() === desId.toString() ? newSrcCardOrder : newDesCardOrder).splice(
                desIdx,
                0,
                orderTarget
            );
            return {
                srcOrder: newSrcCardOrder,
                desOrder: newDesCardOrder
            };
        }
    } catch (err) {
        isDebug() && console.log(err);
    }
    return null;
};

export function validateBody(...args: Array<[string | undefined | null, number, number]>): boolean {
    for (let i = 0; i < args.length; i++) {
        const [target, min, max] = args[i];
        if (
            typeof target !== 'undefined' &&
            target !== null &&
            (target.length < min || target.length > max)
        ) {
            return false;
        }
    }
    return true;
}
