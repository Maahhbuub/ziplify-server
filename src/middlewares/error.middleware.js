import appError from '../utils/appError.js';

const globalError = (err, req, res, next) => {
    console.log(err); //todo: delete it in production
    const status = err.statusCode || 500; // fixed: statusCode, not status
    const message = err.message || 'Internal server error';

    res.status(status).json({
        success: false,
        message: message,
        code: err.code, // pass through custom error codes like EMAIL_NOT_VERIFIED
    });
};

const invalidRoute = (req, res, next) => {
    next(new appError(404, `Can't find ${req.originalUrl} route on this server`));
};

export { globalError, invalidRoute };