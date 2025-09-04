import { ErrorRequestHandler } from "express";
import { apiError } from "../utils";

export const errorConvertor: ErrorRequestHandler = (err, req, res, next) => {
    let error =err;
    if(!(error instanceof apiError)) {
        const statusCode = error.statusCode || (error instanceof Error ? 400 : 500)

        const message = error.message || (statusCode === 400 ? "Bad request" : "Internal server error");
        error = new apiError(statusCode, message, false, err.stack.toString());
    }
    next(error);
};

export const errorHandler: ErrorRequestHandler = (err,req,res,next) => {
    let {statusCode, message} = err;
    if( process.env.NODE_ENV === "production" && !err.isOperational) {
        statusCode = 500;
        message = "Internal server error"
    }

    res.locals.errorMessage = err.message;

    const response = {
        code: statusCode,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack}),
    }

    if(process.env.NODE_ENV === "development"){
        console.error(err);
    }

    res.status(statusCode).json(response);
    next();
}