// src/models/Vehicle.js
const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  make: {
    type: String,
    required: [true, 'La marque est requise'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Le modèle est requis'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'L\'année est requise'],
    min: [1900, 'L\'année doit être supérieure à 1900'],
    max: [new Date().getFullYear() + 1, 'L\'année ne peut pas être dans le futur']
  },
  color: {
    type: String,
    required: [true, 'La couleur est requise'],
    trim: true
  },
  licensePlate: {
    type: String,
    required: [true, 'La plaque d\'immatriculation est requise'],
    unique: true,
    trim: true,
    uppercase: true
  },
  vin: {
    type: String,
    required: [true, 'Le numéro VIN est requis'],
    unique: true,
    trim: true,
    minlength: [17, 'Le VIN doit contenir 17 caractères'],
    maxlength: [17, 'Le VIN doit contenir 17 caractères']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Vehicle', vehicleSchema);

