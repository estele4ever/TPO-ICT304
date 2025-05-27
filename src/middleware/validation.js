// src/middleware/validation.js
const Joi = require('joi');

const validateUser = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('user', 'admin').default('user')
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: error.details.map(detail => detail.message)
    });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Données de connexion invalides',
      errors: error.details.map(detail => detail.message)
    });
  }
  next();
};

const validateVehicle = (req, res, next) => {
  const schema = Joi.object({
    make: Joi.string().required(),
    model: Joi.string().required(),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).required(),
    color: Joi.string().required(),
    licensePlate: Joi.string().required(),
    vin: Joi.string().length(17).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Données du véhicule invalides',
      errors: error.details.map(detail => detail.message)
    });
  }
  next();
};

module.exports = { validateUser, validateLogin, validateVehicle };
