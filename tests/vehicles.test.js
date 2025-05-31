
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
