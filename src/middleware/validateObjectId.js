const mongoose = require('mongoose');

const validateObjectId =
  (...paramNames) =>
  (req, res, next) => {
    for (const paramName of paramNames) {
      const value = req.params[paramName];

      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        return res.status(400).json({ message: `Invalid ${paramName}` });
      }
    }

    next();
  };

module.exports = { validateObjectId };
