// import appError from '../utils/appError.js';

// const globalError = (err, req, res, next) => {
//     // console.log(err); //todo: delete it in production
//     const status = err.statusCode || 500;
//     const message = err.message || 'Internal server error';

//     res.status(status).json({
//         success: false,
//         message: message,
//         code: err.code, // pass through custom error codes like EMAIL_NOT_VERIFIED
//     });
// };

// const invalidRoute = (req, res, next) => {
//     next(new appError(404, `Can't find ${req.originalUrl} route on this server`));
// };

// export { globalError, invalidRoute };

import appError from '../utils/appError.js';

const globalError = (err, req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        console.error(err);
    }

    let status = err.statusCode || err.status || 500;
    let message = err.message || 'Internal server error';
    let code = err.code;

    // JWT errors have no status code, so without this they come back as 500
    if (err.name === 'TokenExpiredError') {
        status = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    } else if (err.name === 'JsonWebTokenError') {
        status = 401;
        message = 'Invalid token';
        code = 'TOKEN_INVALID';
    }

    if (status >= 500 && process.env.NODE_ENV === 'production') {
        message = 'Internal server error';
    }

    res.status(status).json({
        success: false,
        message,
        code,
    });
};

const invalidRoute = (req, res, next) => {
    next(new appError(404, `Can't find ${req.originalUrl} route on this server`));
};

export { globalError, invalidRoute };