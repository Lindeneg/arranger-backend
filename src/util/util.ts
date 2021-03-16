import jwt from 'jsonwebtoken';
import { isDebug } from './constants';
import { TokenData } from './types';


export const getToken = (pl: string | object): string | null => {
    if (typeof process.env.JWT_PRIVATE_TOKEN !== 'undefined') {
        return jwt.sign(pl, process.env.JWT_PRIVATE_TOKEN, {expiresIn: '1h'});
    }
    return null;
};


export const verifyToken = (token: string): TokenData | null => {
    try {
        if (typeof process.env.JWT_PRIVATE_TOKEN !== 'undefined') {
            const result: TokenData = jwt.verify(token, process.env.JWT_PRIVATE_TOKEN) as TokenData;
            if (typeof result === 'object') {
                return result;
            } else {
                isDebug && console.log('unexpected token result: ' + result);
            }
        }
    } catch(err) {
        isDebug && console.log(err);
    }
    return null;
};

export const cmp = (tokenData: TokenData | undefined, target: string | any): boolean => {
    if (typeof tokenData !== 'undefined' && typeof tokenData.userId !== 'undefined' && typeof target !== 'undefined') {
        try {
            return tokenData.userId.toString() === target.toString();
        } catch(err) {
            isDebug && console.log(`could not compare ${tokenData} with ${target}`);
        }
    }
    return false;
}