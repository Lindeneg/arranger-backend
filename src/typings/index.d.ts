import { TokenData } from "./util";

// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/express-serve-static-core/index.d.ts#L15-L23

declare global {
    namespace Express {
        interface Request {
            userData?: TokenData
        }
    }
};