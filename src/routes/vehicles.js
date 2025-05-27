// src/routes/vehicles.js
const express = require('express');
const Vehicle = require('../models/Vehicle');
const { authenticate, authorize } = require('../middleware/auth');
const { validateVehicle } = require('../middleware/validation');
const router = express.Router();

// GET /api/vehicles - Lister tous les véhicules (protégé)
router.get('/', authenticate, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ isActive: true }).populate('owner', 'username email');
    res.json({
      success: true,
      data: vehicles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des véhicules'
    });
  }
});

// POST /api/vehicles - Créer un véhicule (protégé)
router.post('/', authenticate, validateVehicle, async (req, res) => {
  try {
    const vehicle = new Vehicle({
      ...req.body,
      owner: req.user._id
    });
    await vehicle.save();
    
    res.status(201).json({
      success: true,
      message: 'Véhicule créé avec succès',
      data: vehicle
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Plaque d\'immatriculation ou VIN déjà existant'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du véhicule',
      error: error.message
    });
  }
});

// GET /api/vehicles/:id - Récupérer un véhicule (protégé)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate('owner', 'username email');
    
    if (!vehicle || !vehicle.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Véhicule non trouvé'
      });
    }

    res.json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du véhicule'
    });
  }
});

// PUT /api/vehicles/:id - Mettre à jour un véhicule (protégé)
router.put('/:id', authenticate, validateVehicle, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle || !vehicle.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Véhicule non trouvé'
      });
    }

    // Vérifier si l'utilisateur est propriétaire ou admin
    if (req.user.role !== 'admin' && vehicle.owner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit'
      });
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('owner', 'username email');

    res.json({
      success: true,
      message: 'Véhicule mis à jour avec succès',
      data: updatedVehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du véhicule',
      error: error.message
    });
  }
});

// DELETE /api/vehicles/:id - Supprimer un véhicule (protégé)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle || !vehicle.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Véhicule non trouvé'
      });
    }

    // Vérifier si l'utilisateur est propriétaire ou admin
    if (req.user.role !== 'admin' && vehicle.owner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit'
      });
    }

    await Vehicle.findByIdAndUpdate(req.params.id, { isActive: false });

    res.json({
      success: true,
      message: 'Véhicule supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du véhicule'
    });
  }
});

module.exports = router;

