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

<<<<<<< HEAD
// GET /api/vehicles/make/:make - Récupérer les véhicules par marque
router.get('/make/:make', authenticate, async (req, res) => {
  try {
    const { make } = req.params;
    
    // Recherche insensible à la casse
    const vehicles = await Vehicle.find({ 
      make: new RegExp(make, 'i'),
      isActive: true 
    }).populate('owner', 'username email');
    
    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Aucun véhicule trouvé pour la marque "${make}"`
      });
    }

    res.json({
      success: true,
      message: `${vehicles.length} véhicule(s) trouvé(s) pour la marque "${make}"`,
      data: vehicles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche par marque',
      error: error.message
    });
  }
});

// GET /api/vehicles/year/:year - Récupérer les véhicules par année
router.get('/year/:year', authenticate, async (req, res) => {
  try {
    const { year } = req.params;
    
    // Validation de l'année
    const yearNumber = parseInt(year);
    if (isNaN(yearNumber) || yearNumber < 1900 || yearNumber > new Date().getFullYear() + 1) {
      return res.status(400).json({
        success: false,
        message: 'Année invalide'
      });
    }
    
    const vehicles = await Vehicle.find({ 
      year: yearNumber,
      isActive: true 
    }).populate('owner', 'username email');
    
    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Aucun véhicule trouvé pour l'année ${year}`
      });
    }

    res.json({
      success: true,
      message: `${vehicles.length} véhicule(s) trouvé(s) pour l'année ${year}`,
      data: vehicles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche par année',
      error: error.message
    });
  }
});

// GET /api/vehicles/search - Recherche avancée par marque ET année (bonus)
router.get('/search', authenticate, async (req, res) => {
  try {
    const { make, year, model } = req.query;
    const searchCriteria = { isActive: true };
    
    if (make) {
      searchCriteria.make = new RegExp(make, 'i');
    }
    
    if (year) {
      const yearNumber = parseInt(year);
      if (!isNaN(yearNumber)) {
        searchCriteria.year = yearNumber;
      }
    }
    
    if (model) {
      searchCriteria.model = new RegExp(model, 'i');
    }
    
    const vehicles = await Vehicle.find(searchCriteria).populate('owner', 'username email');
    
    res.json({
      success: true,
      message: `${vehicles.length} véhicule(s) trouvé(s)`,
      data: vehicles,
      searchCriteria: { make, year, model }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche',
      error: error.message
    });
  }
});

=======
>>>>>>> ad6356a49617bc80157d79b839f12615aa266492
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

<<<<<<< HEAD
// PUT /api/vehicles/:id/deactivate - Désactiver un véhicule
router.put('/:id/deactivate', authenticate, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
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

    if (!vehicle.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Le véhicule est déjà désactivé'
      });
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { 
        isActive: false,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('owner', 'username email');

    res.json({
      success: true,
      message: 'Véhicule désactivé avec succès',
      data: updatedVehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la désactivation du véhicule',
      error: error.message
    });
  }
});

// PUT /api/vehicles/:id/activate - Activer/Réactiver un véhicule
router.put('/:id/activate', authenticate, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
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

    if (vehicle.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Le véhicule est déjà actif'
      });
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { 
        isActive: true,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('owner', 'username email');

    res.json({
      success: true,
      message: 'Véhicule activé avec succès',
      data: updatedVehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'activation du véhicule',
      error: error.message
    });
  }
});

=======
>>>>>>> ad6356a49617bc80157d79b839f12615aa266492
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

<<<<<<< HEAD
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      updateData,
=======
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
>>>>>>> ad6356a49617bc80157d79b839f12615aa266492
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

<<<<<<< HEAD
    await Vehicle.findByIdAndUpdate(req.params.id, { 
      isActive: false,
      updatedAt: new Date()
    });
=======
    await Vehicle.findByIdAndUpdate(req.params.id, { isActive: false });
>>>>>>> ad6356a49617bc80157d79b839f12615aa266492

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

<<<<<<< HEAD
module.exports = router;
=======
module.exports = router;

>>>>>>> ad6356a49617bc80157d79b839f12615aa266492
