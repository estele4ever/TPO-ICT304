// Tests pour les endpoints des véhicules
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');

describe('Vehicles Endpoints', () => {
  let userToken, user;

  beforeAll(async () => {
<<<<<<< HEAD
    await mongoose.connect('mongodb://localhost:27017/propelize_db');
=======
    await mongoose.connect('mongodb://localhost:27017/propelize_test');
>>>>>>> ad6356a49617bc80157d79b839f12615aa266492
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
