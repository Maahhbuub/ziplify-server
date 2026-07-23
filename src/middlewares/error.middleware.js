import appError from '../utils/appError.js';

const globalError = (err, req, res, next) => {
    console.log(err); //todo: delete it in production
    let { status = 500, message = 'Internal server error' } = err;

    res.status(status).json({
        status: status,
        message: "Error - " + message,
    });
};

const invalidRoute = (req, res, next) => {
    next(new appError(404, `Can't find ${req.originalUrl} route on this server`));
};

export { globalError, invalidRoute };