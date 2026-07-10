/**
 * File: errorMiddleware.js
 *
 * Purpose:
 * Centralized Express error handling for unmatched routes and thrown/passed errors.
 *
 * Main responsibilities:
 * - notFound: converts unknown URLs into a 404 Error and forwards it with next().
 * - errorHandler: sends a JSON { message } response with an appropriate status code.
 *
 * Connections:
 * - Registered at the end of the middleware stack in app.js.
 * - Any route that calls next(error) or relies on Express's default error path
 *   can reach errorHandler (depending on how errors are raised).
 *
 * Important concepts:
 * Middleware order (404 after routes, error handler last), Express's four-argument
 * error middleware signature, and preserving a status code set earlier on res.
 */

/**
 * Handles requests that matched no route.
 *
 * Sets status 404, then calls next(error) so errorHandler formats the JSON body.
 * Registering this before errorHandler is required; calling next(error) alone
 * would not set 404 if this middleware were omitted.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Final error middleware. Express invokes this when next(err) is called
 * or when an error reaches the end of the stack.
 *
 * If a previous middleware already set a non-200 status (for example 404),
 * that status is kept. Otherwise defaults to 500 for unexpected failures.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    message: err.message
  });
};

module.exports = {
  notFound,
  errorHandler
};
