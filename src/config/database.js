// src/config/database.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

/**
 * Fonction pour se connecter à MongoDB
 * @returns {Promise} - Promesse de connexion
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DB_URI, {
      // Options de connexion recommandées
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
    // Arrêter l'application si la connexion échoue
    process.exit(1);
  }
};

/**
 * Fonction pour fermer la connexion à la base
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB déconnecté');
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion:', error.message);
  }
};

export { connectDB, disconnectDB };