import path from 'path';

import express, { Express, Request, Response, NextFunction } from 'express';
import { connect } from 'mongoose';
import { json as bodyParserJSON } from 'body-parser';
import { config } from 'dotenv';

import userRouter from './routes/user.route';
import boardRouter from './routes/board.route';
import listRouter from './routes/list.route';
import cardRouter from './routes/card.route';
import checklistRouter from './routes/checklist.route';
import HTTPException from './models/exception.model';
import { isDebug, requiredEnvVars } from './util';


// setup environment
config({path: path.resolve(__dirname, '../.env')});

// verify environment
requiredEnvVars.forEach(key => {
    if (typeof process.env[key] === 'undefined') {
        throw new Error(key + ' is undefined');
    }
});

// base express app
const app: Express = express();

// json.. whats not to like
app.use(bodyParserJSON());


// expected request origin, headers and methods.
app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.WHITELISTED_DOMAIN || 'localhost:3000');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    next();
});

// available API routes
app.use('/api/user', userRouter);
app.use('/api/boards', boardRouter);
app.use('/api/lists', listRouter);
app.use('/api/cards', cardRouter);
app.use('/api/checklists', checklistRouter);


// if no routes are met, then respond with a 404
app.use((req: Request, res: Response, next: NextFunction) => {
    next(HTTPException.rNotFound());
});

// handle responses with errors or exceptions.
app.use(((error: HTTPException | any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        next(error);
    } else {
        const fallBack: string = isDebug ? error : 'Something went wrong. Please try again.';
        res.status(error.statusCode || 500).json(error instanceof HTTPException ? error.toResponse() : (error instanceof Error ? error.message : fallBack));
    }
}));

// setup the whole shebang..
console.log('connecting to mongodb...')
// https://mongoosejs.com/docs/deprecations.html
connect(`mongodb+srv://${process.env.MONGO_DB_USER}:${encodeURIComponent(process.env.MONGO_DB_KEY || '')}@${process.env.MONGO_DB_CLUSTER}.mongodb.net/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority`, {
    useNewUrlParser   : true, 
    useUnifiedTopology: true,
    useCreateIndex    : true,
    useFindAndModify  : false
})
.then(() => {
    // only start server if connection to database exists
    app.listen(process.env.PORT, () => {
        console.log('connected to mongodb\nstarting server on port ' + process.env.PORT);
    });
})
.catch((err) => {
    console.log('connection to mongodb failed...');
    isDebug && console.log(err);
});