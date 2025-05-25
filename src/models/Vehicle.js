// src/models/Vehicle.js
import mongoose from 'mongoose';

/**
 * Schéma du véhicule
 * Définit la structure des données dans MongoDB
 */
const vehicleSchema = new mongoose.Schema({
  make: {
    type: String,
    required: [true, 'La marque est obligatoire'],
    trim: true, // Supprime les espaces en début/fin
    maxlength: [50, 'La marque ne peut pas dépasser 50 caractères']
  },
  model: {
    type: String,
    required: [true, 'Le modèle est obligatoire'],
    trim: true,
    maxlength: [50, 'Le modèle ne peut pas dépasser 50 caractères']
  },
  year: {
    type: Number,
    required: [true, 'L\'année est obligatoire'],
    min: [1900, 'L\'année doit être supérieure à 1900'],
    max: [new Date().getFullYear() + 1, 'L\'année ne peut pas être dans le futur']
  },
  price: {
    type: Number,
    required: [true, 'Le prix est obligatoire'],
    min: [0, 'Le prix doit être positif']
  },
  isAvailable: {
    type: Boolean,
    default: true // Par défaut, le véhicule est disponible
  },
  description: {
    type: String,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  }
}, {
  // Options du schéma
  timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  versionKey: false // Supprime le champ __v
});

/**
 * Méthode virtuelle pour obtenir l'âge du véhicule
 */
vehicleSchema.virtual('age').get(function() {
  return new Date().getFullYear() - this.year;
});

/**
 * Méthode d'instance pour formatter les informations du véhicule
 */
vehicleSchema.methods.getFullName = function() {
  return `${this.make} ${this.model} (${this.year})`;
};

/**
 * Méthode statique pour trouver les véhicules disponibles
 */
vehicleSchema.statics.findAvailable = function() {
  return this.find({ isAvailable: true });
};

// Créer et exporter le modèle
const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;