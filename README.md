Projet d'ict304 software testing en cour de realisation


# tests/auth.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Authentication Endpoints', () => {
  beforeAll(async () => {
    // Connexion à une base de données de test
    await mongoose.connect('mongodb://localhost:27017/propelize_test');
  });

  beforeEach(async () => {
    // Nettoyer la base de données avant chaque test
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Créer un utilisateur de test
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      const user = new User(userData);
      await user.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate input data', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      // Créer un utilisateur et se connecter
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      const user = new User(userData);
      await user.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const { refreshToken } = loginResponse.body.data;

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});

# tests/users.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Users Endpoints', () => {
  let adminToken, userToken, adminUser, regularUser;

  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/propelize_test');
  });

  beforeEach(async () => {
    await User.deleteMany({});

    // Créer un admin
    adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin'
    });
    await adminUser.save();

    // Créer un utilisateur régulier
    regularUser = new User({
      username: 'user',
      email: 'user@example.com',
      password: 'password123',
      role: 'user'
    });
    await regularUser.save();

    // Obtenir les tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });
    adminToken = adminLogin.body.data.accessToken;

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });
    userToken = userLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/users', () => {
    it('should create user as admin', async () => {
      const newUser = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('newuser');
    });

    it('should reject user creation by regular user', async () => {
      const newUser = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newUser);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/profile', () => {
    it('should get user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('user');
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});

# tests/vehicles.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');

describe('Vehicles Endpoints', () => {
  let userToken, user;

  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/propelize_test');
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Vehicle.deleteMany({});

    // Créer un utilisateur
    user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    await user.save();

    // Obtenir le token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    userToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/vehicles', () => {
    it('should create vehicle with valid data', async () => {
      const vehicleData = {
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        color: 'Rouge',
        licensePlate: 'ABC123',
        vin: '1234567890ABCDEFG'
      };

      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send(vehicleData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.make).toBe('Toyota');
      expect(response.body.data.owner).toBe(user._id.toString());
    });

    it('should reject invalid vehicle data', async () => {
      const invalidVehicle = {
        make: 'Toyota',
        // model manquant
        year: 1800, // année invalide
        color: 'Rouge',
        licensePlate: 'ABC123',
        vin: '123' // VIN trop court
      };

      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidVehicle);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const vehicleData = {
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        color: 'Rouge',
        licensePlate: 'ABC123',
        vin: '1234567890ABCDEFG'
      };

      const response = await request(app)
        .post('/api/vehicles')
        .send(vehicleData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/vehicles', () => {
    it('should get all vehicles for authenticated user', async () => {
      // Créer quelques véhicules
      await Vehicle.create([
        {
          make: 'Toyota',
          model: 'Camry',
          year: 2023,
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '1234567890ABCDEFG',
          owner: user._id
        },
        {
          make: 'Honda',
          model: 'Civic',
          year: 2022,
          color: 'Bleu',
          licensePlate: 'XYZ789',
          vin: '0987654321HIJKLMN',
          owner: user._id
        }
      ]);

      const response = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });
});

# tests/integration/api.integration.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Vehicle = require('../../src/models/Vehicle');

describe('API Integration Tests', () => {
  let adminToken, userToken, adminId, userId;

  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/propelize_integration_test');
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Vehicle.deleteMany({});

    // Créer un admin
    const admin = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin'
    });
    await admin.save();
    adminId = admin._id;

    // Créer un utilisateur
    const user = new User({
      username: 'user',
      email: 'user@example.com',
      password: 'password123',
      role: 'user'
    });
    await user.save();
    userId = user._id;

    // Obtenir les tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });
    adminToken = adminLogin.body.data.accessToken;

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });
    userToken = userLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Complete User-Vehicle Workflow', () => {
    it('should complete full workflow: create user, login, create vehicle, get vehicles', async () => {
      // 1. Admin crée un nouvel utilisateur
      const newUserResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
          role: 'user'
        });

      expect(newUserResponse.status).toBe(201);
      expect(newUserResponse.body.success).toBe(true);

      // 2. Nouvel utilisateur se connecte
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newuser@example.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      const newUserToken = loginResponse.body.data.accessToken;

      // 3. Utilisateur crée un véhicule
      const vehicleResponse = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send({
          make: 'Tesla',
          model: 'Model 3',
          year: 2023,
          color: 'Blanc',
          licensePlate: 'TESLA123',
          vin: '5YJ3E1EA4KF000001'
        });

      expect(vehicleResponse.status).toBe(201);
      expect(vehicleResponse.body.success).toBe(true);

      // 4. Utilisateur récupère ses véhicules
      const vehiclesResponse = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${newUserToken}`);

      expect(vehiclesResponse.status).toBe(200);
      expect(vehiclesResponse.body.data).toHaveLength(1);
      expect(vehiclesResponse.body.data[0].make).toBe('Tesla');
    });

    it('should handle token refresh workflow', async () => {
      // 1. Connexion initiale
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123'
        });

      const { refreshToken } = loginResponse.body.data;

      // 2. Renouvellement du token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.accessToken).toBeDefined();

      // 3. Utilisation du nouveau token
      const newToken = refreshResponse.body.data.accessToken;
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${newToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.success).toBe(true);
    });
  });

  describe('Security Tests', () => {
    it('should prevent unauthorized access to admin endpoints', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should prevent users from accessing others vehicles', async () => {
      // Créer un véhicule pour l'admin
      const vehicle = await Vehicle.create({
        make: 'BMW',
        model: 'X5',
        year: 2023,
        color: 'Noir',
        licensePlate: 'BMW123',
        vin: 'WBAFR1C50BC000001',
        owner: adminId
      });

      // L'utilisateur régulier essaie de modifier le véhicule de l'admin
      const response = await request(app)
        .put(`/api/vehicles/${vehicle._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          make: 'Mercedes',
          model: 'C-Class',
          year: 2023,
          color: 'Rouge',
          licensePlate: 'MERC123',
          vin: 'WBAFR1C50BC000002'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});

# jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/database.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};

# tests/setup.js
const mongoose = require('mongoose');

// Configuration globale pour les tests
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://localhost:27017/propelize_test');
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

# README.md
# 🚗 API Propelize - Gestion Sécurisée des Véhicules et Utilisateurs

Une API REST sécurisée pour la gestion des véhicules et utilisateurs, développée avec Node.js, Express, et MongoDB.

## 📋 Table des Matières

- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [API Endpoints](#api-endpoints)
- [Sécurité](#sécurité)
- [Tests](#tests)
- [Docker](#docker)

## ✨ Fonctionnalités

### 🔐 Authentification et Autorisation
- **JWT avec Access & Refresh Tokens** : Système de double token pour une sécurité renforcée
- **Gestion des Rôles** : Différentiation entre utilisateurs (`user`) et administrateurs (`admin`)
- **Authentification sécurisée** : Hash des mots de passe avec bcrypt
- **Protection des routes** : Middleware d'authentification sur toutes les routes sensibles

### 👥 Gestion des Utilisateurs
- **CRUD complet** : Création, lecture, mise à jour, suppression
- **Profils utilisateurs** : Gestion des informations personnelles
- **Contrôle d'accès** : Les utilisateurs ne peuvent modifier que leurs propres données
- **Administration** : Les admins peuvent gérer tous les utilisateurs

### 🚗 Gestion des Véhicules
- **Catalogue de véhicules** : Informations complètes (marque, modèle, année, couleur, etc.)
- **Propriété** : Association véhicule-propriétaire
- **Validation** : Contrôles stricts sur les données (VIN, plaque d'immatriculation)
- **Sécurité** : Accès restreint aux véhicules selon la propriété

### 🔒 Sécurité Avancée
- **Rate Limiting** : Protection contre les attaques par déni de service
- **Helmet.js** : Headers de sécurité HTTP
- **CORS configuré** : Contrôle d'accès cross-origin
- **Validation des données** : Validation robuste avec Joi
- **Soft Delete** : Suppression logique des données

## 🏗️ Architecture

```
src/
├── config/
│   └── database.js          # Configuration MongoDB avec seeders
├── middleware/
│   ├── auth.js              # Authentification et autorisation
│   └── validation.js        # Validation des données
├── models/
│   ├── User.js              # Modèle utilisateur
│   └── Vehicle.js           # Modèle véhicule
├── routes/
│   ├── auth.js              # Routes d'authentification
│   ├── users.js             # Routes utilisateurs
│   └── vehicles.js          # Routes véhicules
├── utils/
│   └── tokenUtils.js        # Utilitaires JWT
├── app.js                   # Configuration Express
└── server.js               # Point d'entrée
```

## 🚀 Installation

### Prérequis
- Node.js 18+
- MongoDB 6.0+
- Docker & Docker Compose (optionnel)

### Installation locale

```bash
# Cloner le projet
git clone [votre-repo]
cd propelize-api

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Modifier les valeurs dans .env

# Démarrer MongoDB (si installé localement)
mongod

# Démarrer l'application
npm run dev
```

### Installation avec Docker

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f api
```

## 📡 API Endpoints

### 🔐 Authentification (`/api/auth`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/login` | Connexion utilisateur | ❌ |
| POST | `/refresh` | Renouveler le token | ❌ |
| POST | `/logout` | Déconnexion | ✅ |

### 👥 Utilisateurs (`/api/users`)

| Méthode | Endpoint | Description | Auth | Rôle |
|---------|----------|-------------|------|------|
| POST | `/` | Créer un utilisateur | ✅ | Admin |
| GET | `/` | Lister les utilisateurs | ✅ | Admin |
| GET | `/profile` | Profil personnel | ✅ | - |
| PUT | `/:id` | Modifier un utilisateur | ✅ | Owner/Admin |
| DELETE | `/:id` | Supprimer un utilisateur | ✅ | Admin |

### 🚗 Véhicules (`/api/vehicles`)

| Méthode | Endpoint | Description | Auth | Rôle |
|---------|----------|-------------|------|------|
| GET | `/` | Lister les véhicules | ✅ | - |
| POST | `/` | Créer un véhicule | ✅ | - |
| GET | `/:id` | Détails d'un véhicule | ✅ | - |
| PUT | `/:id` | Modifier un véhicule | ✅ | Owner/Admin |
| DELETE | `/:id` | Supprimer un véhicule | ✅ | Owner/Admin |

## 🔐 Authentification

### Connexion
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@propelize.com",
    "password": "password123"
  }'
```

### Utilisation des tokens
```bash
# Avec access token
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Renouveler le token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

## 🧪 Tests

Le projet inclut une suite complète de tests unitaires et d'intégration.

### Exécuter les tests

```bash
# Tous les tests
npm test

# Tests en mode watch
npm run test:watch

# Tests avec couverture
npm run test:coverage
```

### Types de tests

- **Tests unitaires** : Fonctions individuelles
- **Tests d'intégration** : Endpoints API complets
- **Tests de sécurité** : Authentification et autorisation
- **Tests de workflow** : Scénarios complets utilisateur

## 🐳 Docker

### Services inclus

- **API Node.js** : Application principale (port 3000)
- **MongoDB** : Base de données (port 27017)
- **Mongo Express** : Interface d'administration (port 8081)

### Commandes Docker

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs de l'API
docker-compose logs -f api

# Redémarrer un service
docker-compose restart api

# Arrêter tous les services
docker-compose down

# Supprimer les volumes (données)
docker-compose down -v
```

## 🔧 Configuration

### Variables d'environnement

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/propelize_db
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000
```

### Données par défaut (Seeders)

L'application charge automatiquement des données initiales :

**Utilisateurs :**
- Admin : `admin@propelize.com` / `password123`
- User : `user1@propelize.com` / `password123`

**Véhicules :**
- Toyota Camry 2023
- Honda Civic 2022

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Interface MongoDB
Accès via : http://localhost:8081
- Utilisateur : `admin`
- Mot de passe : `admin123`

## 🛡️ Sécurité

### Mesures implémentées

- **JWT sécurisé** : Tokens signés avec secret fort
- **Rate limiting** : 100 requêtes/15min par IP
- **Validation stricte** : Toutes les entrées validées
- **Headers sécurisés** : Helmet.js configuré
- **Hash des mots de passe** : bcrypt avec salt
- **CORS configuré** : Origines autorisées uniquement
- **Soft delete** : Données jamais supprimées définitivement

### Recommandations production

1. **Changer tous les secrets** dans `.env`
2. **Configurer HTTPS** avec certificats SSL
3. **Utiliser MongoDB Atlas** ou cluster sécurisé
4. **Configurer un proxy inverse** (Nginx)
5. **Activer les logs** de sécurité
6. **Mettre en place la surveillance** des performances

## 📈 Développement

### Structure des commits
- `feat:` Nouvelle fonctionnalité
- `fix:` Correction de bug
- `docs:` Documentation
- `style:` Formatage
- `refactor:` Refactoring
- `test:` Tests
- `chore:` Maintenance

### Workflow
1. Créer une branche feature
2. Développer avec tests
3. Vérifier la couverture de code
4. Créer une pull request
5. Review et merge

---

## 📞 Support

Pour toute question ou problème :
- Créer une issue sur le repository
- Consulter la documentation des endpoints
- Vérifier les logs avec `docker-compose logs -f api`

**Développé avec ❤️ pour Propelize**








# 📋 PLAN DE TEST - API PROPELIZE

## 📄 Informations du Document

| Élément | Détail |
|---------|--------|
| **Projet** | API Propelize - Gestion Sécurisée des Véhicules et Utilisateurs |
| **Version** | 1.0.0 |
| **Date** | Décembre 2024 |
| **Équipe** | Développement Software Testing ICT 304 |
| **Responsable** | Dr KIMBI Xaveria |
| **Type de Test** | Unitaire, Intégration, Sécurité, Performance |

---

## 🎯 1. OBJECTIFS DU PLAN DE TEST

### 1.1 Objectif Principal
Valider le bon fonctionnement, la sécurité et la fiabilité de l'API Propelize dans ses fonctionnalités de gestion des utilisateurs et des véhicules avec un système d'authentification robuste.

### 1.2 Objectifs Spécifiques
- **Fonctionnalité** : Tester tous les endpoints CRUD pour Users et Vehicles
-