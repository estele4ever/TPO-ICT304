// src/routes/users.js
const express = require('express');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { validateUser } = require('../middleware/validation');
const router = express.Router();

// POST /api/users - Créer un utilisateur (admin uniquement)
router.post('/', authenticate, authorize('admin'), validateUser, async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: user
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Nom d\'utilisateur ou email déjà existant'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'utilisateur',
      error: error.message
    });
  }
});

// GET /api/users - Lister tous les utilisateurs (admin uniquement)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select('-password -refreshTokens');
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs'
    });
  }
});

// GET /api/users/profile - Profil de l'utilisateur connecté
router.get('/profile', authenticate, async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

// PUT /api/users/:id - Mettre à jour un utilisateur
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Un utilisateur ne peut modifier que son propre profil, sauf s'il est admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit'
      });
    }

    const updates = { ...req.body };
    delete updates.password; // Empêcher la modification du mot de passe via cette route
    delete updates.role; // Seul un admin peut modifier les rôles

    const user = await User.findByIdAndUpdate(id, updates, { 
      new: true, 
      runValidators: true 
    }).select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message
    });
  }
});

// DELETE /api/users/:id - Supprimer un utilisateur (admin uniquement)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Utilisateur désactivé avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
});

module.exports = router;
