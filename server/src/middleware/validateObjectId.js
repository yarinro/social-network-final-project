/**
 * File: validateObjectId.js
 *
 * Purpose:
 * Factory middleware that rejects requests whose route parameters are not
 * valid MongoDB ObjectId strings, before controllers run findById queries.
 *
 * Main responsibilities:
 * - Accept one or more param names (for example 'id', 'userId').
 * - Validate each present req.params value with mongoose.Types.ObjectId.isValid.
 * - Return 400 early on invalid ids to avoid CastError noise in controllers.
 *
 * Connections:
 * - Used in userRoutes, groupRoutes, postRoutes, and messageRoutes on
 *   paths that include :id or similar parameters.
 * - Controllers can then assume the id format is plausible (the document
 *   may still be missing → 404).
 *
 * Important concepts:
 * Middleware factories (function returning middleware), route params vs
 * query strings, and defensive validation at the routing layer.
 */

const mongoose = require('mongoose');

/**
 * Creates middleware that validates named route parameters as ObjectIds.
 *
 * Example: validateObjectId('id') checks req.params.id.
 * Example: validateObjectId('id', 'userId') checks both params if present.
 *
 * Why a factory? Different routes use different param names; one reusable
 * helper avoids copying the same isValid check into every controller.
 *
 * @param {...string} paramNames - Names of req.params keys to validate.
 * @returns {import('express').RequestHandler} Express middleware.
 */
const validateObjectId =
  (...paramNames) =>
  (req, res, next) => {
    for (const paramName of paramNames) {
      const value = req.params[paramName];

      // Skip empty values; only reject when a value exists but is malformed.
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        return res.status(400).json({ message: `Invalid ${paramName}` });
      }
    }

    next();
  };

module.exports = { validateObjectId };
