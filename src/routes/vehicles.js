// src/routes/vehicles.js
import express from 'express';
import Vehicle from '../models/Vehicle.js';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Vehicle:
 *       type: object
 *       required:
 *         - make
 *         - model
 *         - year
 *         - price
 *       properties:
 *         id:
 *           type: string
 *           description: ID auto-généré du véhicule
 *         make:
 *           type: string
 *           description: Marque du véhicule
 *         model:
 *           type: string
 *           description: Modèle du véhicule
 *         year:
 *           type: number
 *           description: Année du véhicule
 *         price:
 *           type: number
 *           description: Prix du véhicule
 *         isAvailable:
 *           type: boolean
 *           description: Disponibilité du véhicule
 */

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Récupère tous les véhicules
 *     tags: [Vehicles]
 *     responses:
 *       200:
 *         description: Liste des véhicules
 *       500:
 *         description: Erreur serveur
 */
// GET /api/vehicles - Lister tous les véhicules
router.get('/', async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    
    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des véhicules:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des véhicules'
    });
  }
});

/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Récupère un véhicule par ID
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du véhicule
 *     responses:
 *       200:
 *         description: Véhicule trouvé
 *       404:
 *         description: Véhicule non trouvé
 */
// GET /api/vehicles/:id - Obtenir un véhicule par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de véhicule invalide'
      });
    }

    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Véhicule non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du véhicule:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération du véhicule'
    });
  }
});

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Crée un nouveau véhicule
 *     tags: [Vehicles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vehicle'
 *     responses:
 *       201:
 *         description: Véhicule créé avec succès
 *       400:
 *         description: Données invalides
 */
// POST /api/vehicles - Ajouter un nouveau véhicule
router.post('/', async (req, res) => {
  try {
    const vehicleData = req.body;

    // Créer le véhicule
    const vehicle = new Vehicle(vehicleData);
    const savedVehicle = await vehicle.save();

    res.status(201).json({
      success: true,
      message: 'Véhicule créé avec succès',
      data: savedVehicle
    });
  } catch (error) {
    console.error('Erreur lors de la création du véhicule:', error);

    // Gestion des erreurs de validation
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Données de validation invalides',
        details: errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la création du véhicule'
    });
  }
});

/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Met à jour un véhicule
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du véhicule
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vehicle'
 *     responses:
 *       200:
 *         description: Véhicule mis à jour
 *       404:
 *         description: Véhicule non trouvé
 */
// PUT /api/vehicles/:id - Modifier un véhicule
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Vérifier si l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de véhicule invalide'
      });
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true, // Retourner le document mis à jour
        runValidators: true // Exécuter les validations
      }
    );

    if (!updatedVehicle) {
      return res.status(404).json({
        success: false,
        error: 'Véhicule non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Véhicule mis à jour avec succès',
      data: updatedVehicle
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du véhicule:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Données de validation invalides',
        details: errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la mise à jour du véhicule'
    });
  }
});

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Supprime un véhicule
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID du véhicule
 *     responses:
 *       200:
 *         description: Véhicule supprimé
 *       404:
 *         description: Véhicule non trouvé
 */
// DELETE /api/vehicles/:id - Supprimer un véhicule
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de véhicule invalide'
      });
    }

    const deletedVehicle = await Vehicle.findByIdAndDelete(id);

    if (!deletedVehicle) {
      return res.status(404).json({
        success: false,
        error: 'Véhicule non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Véhicule supprimé avec succès',
      data: deletedVehicle
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du véhicule:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la suppression du véhicule'
    });
  }
});

// Route bonus : Récupérer seulement les véhicules disponibles
router.get('/available/list', async (req, res) => {
  try {
    const availableVehicles = await Vehicle.findAvailable();
    
    res.status(200).json({
      success: true,
      count: availableVehicles.length,
      data: availableVehicles
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des véhicules disponibles:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

export default router;