// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const vehicleRoutes = require('./routes/vehicles');

const app = express();

// Connexion à la base de données
connectDB();

// Middleware pour traquer les statistiques de performance
const performanceTracker = (req, res, next) => {
  const startTime = Date.now();
  
  // Intercepter la réponse
  const originalSend = res.send;
  
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Si c'est une requête avec header de test, ajouter les stats
    if (req.headers['x-track-performance'] === 'true') {
      let responseData;
      
      try {
        responseData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        responseData = { originalData: data };
      }
      
      // Ajouter les statistiques de performance
      responseData.performanceStats = {
        requestDuration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        endpoint: `${req.method} ${req.path}`,
        statusCode: res.statusCode,
        headers: {
          userAgent: req.headers['user-agent'],
          contentType: req.headers['content-type']
        }
      };
      
      return originalSend.call(this, JSON.stringify(responseData, null, 2));
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Middleware pour traquer les performances spécifiques aux véhicules
const vehiclePerformanceTracker = (req, res, next) => {
  const startTime = Date.now();
  
  const originalSend = res.send;
  
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (req.headers['x-vehicle-performance'] === 'true') {
      let responseData;
      
      try {
        responseData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        responseData = { originalData: data };
      }
      
      // Déterminer la catégorie de test
      let category = 'general';
      if (req.path.includes('/vehicles') && req.method === 'POST') category = 'creation';
      else if (req.path.includes('/vehicles') && req.method === 'GET') category = 'retrieval';
      else if (req.statusCode === 400) category = 'validation';
      else if (req.statusCode === 401 || req.statusCode === 403) category = 'authentication';
      
      responseData.vehiclePerformanceStats = {
        requestDuration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        endpoint: `${req.method} ${req.path}`,
        statusCode: res.statusCode,
        category: category,
        success: res.statusCode < 400,
        headers: {
          userAgent: req.headers['user-agent']?.substring(0, 50),
          contentType: req.headers['content-type']
        }
      };
      
      return originalSend.call(this, JSON.stringify(responseData, null, 2));
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Limitation du taux de requêtes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP par fenêtre
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard.'
  }
});
app.use('/api/', limiter);

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Application des middlewares de performance
app.use(performanceTracker);
app.use('/api/vehicles', vehiclePerformanceTracker);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Propelize opérationnelle',
    timestamp: new Date().toISOString()
  });
});

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Erreur serveur interne'
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

module.exports = app;