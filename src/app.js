// src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Importer nos routes
import vehicleRoutes from './routes/vehicles.js';

// Charger les variables d'environnement
dotenv.config();

// Créer l'application Express
const app = express();

// Configuration Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Vehicle Management API',
      version: '1.0.0',
      description: 'API pour la gestion de véhicules - Service de location',
      contact: {
        name: 'API Support',
        email: 'support@vehicleservice.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Serveur de développement'
      }
    ]
  },
  apis: ['./src/routes/*.js'], // Chemin vers les fichiers contenant les annotations Swagger
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

// === MIDDLEWARES ===

// Sécurité avec Helmet
app.use(helmet());

// CORS - Autoriser les requêtes cross-origin
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://mondomaine.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Parser JSON
app.use(express.json({ limit: '10mb' }));

// Parser URL-encoded
app.use(express.urlencoded({ extended: true }));

// Middleware de logging simple
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// === ROUTES ===

// Route de base / health check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚗 Vehicle Management API',
    version: '1.0.0',
    status: 'API is running!',
    endpoints: {
      vehicles: '/api/vehicles',
      documentation: '/api-docs',
      health: '/health'
    }
  });
});

// Route de santé
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Vehicle API Documentation'
}));

// Routes de l'API
app.use('/api/vehicles', vehicleRoutes);

// === GESTION DES ERREURS ===

// Route non trouvée (404)
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    message: `La route ${req.method} ${req.originalUrl} n'existe pas`,
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /api-docs',
      'GET /api/vehicles',
      'POST /api/vehicles',
      'GET /api/vehicles/:id',
      'PUT /api/vehicles/:id',
      'DELETE /api/vehicles/:id'
    ]
  });
});

// Middleware de gestion d'erreurs globale
app.use((err, req, res, next) => {
  console.error('❌ Erreur non gérée:', err);

  // Erreur de syntaxe JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'JSON invalide',
      message: 'Le corps de la requête contient du JSON malformé'
    });
  }

  // Erreur par défaut
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;