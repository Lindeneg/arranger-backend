import { ErrorResponseContent, DevError } from '../util';

export default class HTTPException extends Error {
    readonly statusCode: number;
    readonly error?: DevError;

    constructor(message: string, statusCode: number, error?: DevError) {
        super(message);

        this.error = typeof error !== 'undefined' ? error : '';
        this.statusCode = statusCode;
    }

    public toResponse(): ErrorResponseContent {
        const obj: ErrorResponseContent = { message: this.message };
        if (process.env.NODE_ENV === 'development') {
            obj.dev = this.error;
        }
        return obj;
    }

    public static rNotFound(error?: DevError): HTTPException {
        return new HTTPException('The requested resource could not be found.', 404, error);
    }

    public static rMalformed(error?: DevError): HTTPException {
        return new HTTPException('The requested action could not be exercised due to malformed syntax.', 400, error);
    }

    public static rInternal(error?: DevError): HTTPException {
        return new HTTPException('Something went wrong. Please try again later.', 500, error);
    }

    public static rUnprocessable(error?: DevError): HTTPException {
        return new HTTPException(
            'The request was well-formed but not honored. Perhaps the action trying to be performed has already been done?',
            422,
            error
        );
    }

    public static rAuth(error?: DevError): HTTPException {
        return new HTTPException(
            'The provided credentials are either invalid or has insufficient privilege to perform the requested action.',
            401,
            error
        );
    }
}
