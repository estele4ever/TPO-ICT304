// src/routes/users.js
const express = require('express');
<<<<<<< HEAD
const bcrypt = require('bcryptjs');
=======
>>>>>>> ad6356a49617bc80157d79b839f12615aa266492
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

<<<<<<< HEAD
// GET /api/users/:id - Récupérer un utilisateur par son ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Un utilisateur ne peut consulter que son propre profil, sauf s'il est admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit'
      });
    }

    const user = await User.findById(id).select('-password -refreshTokens');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (!user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur',
      error: error.message
    });
  }
});

=======
>>>>>>> ad6356a49617bc80157d79b839f12615aa266492
// GET /api/users/profile - Profil de l'utilisateur connecté
router.get('/profile', authenticate, async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

<<<<<<< HEAD
// PUT /api/users/:id/password - Mettre à jour le mot de passe
router.put('/:id/password', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Un utilisateur ne peut modifier que son propre mot de passe, sauf s'il est admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit'
      });
    }

    // Validation des champs requis
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }

    // Validation de la longueur du nouveau mot de passe
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      });
    }

    const user = await User.findById(id);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier le mot de passe actuel (sauf pour les admins qui peuvent forcer le changement)
    if (req.user.role !== 'admin' || req.user._id.toString() === id) {
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Mot de passe actuel incorrect'
        });
      }
    }

    // Hasher le nouveau mot de passe
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le mot de passe
    await User.findByIdAndUpdate(id, { 
      password: hashedNewPassword,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Mot de passe mis à jour avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du mot de passe',
      error: error.message
    });
  }
});

// PUT /api/users/:id/deactivate - Désactiver un utilisateur
router.put('/:id/deactivate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { 
        isActive: false,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Utilisateur désactivé avec succès',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la désactivation de l\'utilisateur',
      error: error.message
    });
  }
});

// PUT /api/users/:id/activate - Réactiver un utilisateur (bonus)
router.put('/:id/activate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { 
        isActive: true,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Utilisateur réactivé avec succès',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réactivation de l\'utilisateur',
      error: error.message
    });
  }
});

=======
>>>>>>> ad6356a49617bc80157d79b839f12615aa266492
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
<<<<<<< HEAD
    delete updates.role; // Seul un admin peut modifier les rôles via une route dédiée
    updates.updatedAt = new Date();
=======
    delete updates.role; // Seul un admin peut modifier les rôles
>>>>>>> ad6356a49617bc80157d79b839f12615aa266492

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
<<<<<<< HEAD
      { 
        isActive: false,
        updatedAt: new Date()
      },
=======
      { isActive: false },
>>>>>>> ad6356a49617bc80157d79b839f12615aa266492
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

<<<<<<< HEAD
module.exports = router;
=======
module.exports = router;
>>>>>>> ad6356a49617bc80157d79b839f12615aa266492
