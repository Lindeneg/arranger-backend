import HTTPException from '../models/exception.model';
import { verifyToken, EMiddleware, TokenData } from '../util';

export const authCheck: EMiddleware = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        next();
    } else {
        try {
            const authHeader: string[] = req.headers.authorization?.split(' ') || [];
            if (authHeader.length === 2) {
                const token: string = authHeader[1];
                const decToken: TokenData | null = verifyToken(token);
                if (decToken) {
                    req.userData = decToken;
                    next();
                } else {
                    next(HTTPException.rAuth('token could not be successfully verified'));
                }
            } else {
                next(HTTPException.rMalformed('authorization header is invalid'));
            }
        } catch (err) {
            next(HTTPException.rInternal(err));
        }
    }
};
