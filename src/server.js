// src/server.js
import app from './app.js';
import { connectDB, disconnectDB } from './config/database.js';

// Configuration du port
const PORT = process.env.PORT || 3000;

/**
 * Fonction pour démarrer le serveur
 */
const startServer = async () => {
  try {
    // Se connecter à la base de données
    await connectDB();
    
    // Démarrer le serveur
    const server = app.listen(PORT, () => {
      console.log('🚀 ================================');
      console.log(`🚗 Vehicle API Server démarré !`);
      console.log(`🌐 Port: ${PORT}`);
      console.log(`📝 Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api/vehicles`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('🚀 ================================');
    });

    // Gestion propre de l'arrêt du serveur
    const gracefulShutdown = (signal) => {
      console.log(`\n📡 Signal ${signal} reçu, arrêt en cours...`);
      
      server.close(async () => {
        console.log('🔒 Serveur HTTP fermé');
        
        // Fermer la connexion à la base de données
        await disconnectDB();
        
        console.log('✅ Arrêt propre terminé');
        process.exit(0);
      });
    };

    // Écouter les signaux d'arrêt
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Gestion des erreurs non gérées
    process.on('unhandledRejection', (err) => {
      console.error('❌ Promesse rejetée non gérée:', err);
      server.close(() => {
        process.exit(1);
      });
    });

    process.on('uncaughtException', (err) => {
      console.error('❌ Exception non gérée:', err);
      process.exit(1);
    });

    return server;
    
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error.message);
    process.exit(1);
  }
};

// Démarrer le serveur seulement si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default startServer;