// tests/integration/api.integration.test.js
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