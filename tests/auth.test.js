// __tests__/auth.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const { generateTokens } = require('../src/utils/tokenUtils');

describe('Auth Endpoints', () => {
  let testUser, userToken, refreshToken;

  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/propelize_test_db');
  });

  beforeEach(async () => {
    // Nettoyer la base de données
    await User.deleteMany({});

    // Créer un utilisateur de test
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      isActive: true
    });
    await testUser.save();

    // Générer des tokens pour les tests
    const tokens = generateTokens(testUser._id);
    userToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;

    // Sauvegarder le refresh token
    testUser.refreshTokens.push({ token: refreshToken });
    await testUser.save();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Inscription réussie');
      expect(response.body.data.user.username).toBe('newuser');
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject registration with existing email', async () => {
      const userData = {
        username: 'anotheruser',
        email: 'test@example.com', // Email déjà utilisé
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email existe déjà');
    });

    it('should reject registration with existing username', async () => {
      const userData = {
        username: 'testuser', // Username déjà utilisé
        email: 'different@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('nom d\'utilisateur est déjà pris');
    });

    it('should reject registration with invalid data', async () => {
      const userData = {
        username: 'ab', // Trop court
        email: 'invalid-email',
        password: '123' // Trop court
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Connexion réussie');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Identifiants incorrects');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Identifiants incorrects');
    });

    it('should reject login for inactive user', async () => {
      // Désactiver l'utilisateur
      await User.findByIdAndUpdate(testUser._id, { isActive: false });

      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Identifiants incorrects');
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token renouvelé avec succès');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.refreshToken).not.toBe(refreshToken); // Nouveau token
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Refresh token invalide ou expiré');
    });

    it('should reject refresh with missing token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Refresh token manquant');
    });

    it('should reject refresh for inactive user', async () => {
      // Désactiver l'utilisateur
      await User.findByIdAndUpdate(testUser._id, { isActive: false });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Refresh token invalide');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Déconnexion réussie');

      // Vérifier que le refresh token a été supprimé
      const user = await User.findById(testUser._id);
      expect(user.refreshTokens.find(rt => rt.token === refreshToken)).toBeUndefined();
    });

    it('should logout successfully without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Déconnexion réussie');
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout-all', () => {
    it('should logout from all devices', async () => {
      // Ajouter plusieurs refresh tokens
      const additionalTokens = [
        generateTokens(testUser._id).refreshToken,
        generateTokens(testUser._id).refreshToken
      ];
      
      testUser.refreshTokens.push(
        ...additionalTokens.map(token => ({ token }))
      );
      await testUser.save();

      const response = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Déconnexion de tous les appareils réussie');

      // Vérifier que tous les refresh tokens ont été supprimés
      const user = await User.findById(testUser._id);
      expect(user.refreshTokens).toHaveLength(0);
    });

    it('should reject logout-all without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout-all');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user.refreshTokens).toBeUndefined();
    });

    it('should reject profile request without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject profile request for inactive user', async () => {
      // Désactiver l'utilisateur
      await User.findByIdAndUpdate(testUser._id, { isActive: false });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Utilisateur non trouvé');
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password with valid current password', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword456'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Mot de passe changé avec succès');

      // Vérifier que l'ancien mot de passe ne fonctionne plus
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(401);

      // Vérifier que le nouveau mot de passe fonctionne
      const newLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'newpassword456'
        });

      expect(newLoginResponse.status).toBe(200);
    });

    it('should reject password change with incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword456'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Mot de passe actuel incorrect');
    });

    it('should reject password change with missing data', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('requis');
    });

    it('should reject password change without authentication', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword456'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .send(passwordData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should invalidate all refresh tokens after password change', async () => {
      // Ajouter plusieurs refresh tokens
      const additionalTokens = [
        generateTokens(testUser._id).refreshToken,
        generateTokens(testUser._id).refreshToken
      ];
      
      testUser.refreshTokens.push(
        ...additionalTokens.map(token => ({ token }))
      );
      await testUser.save();

      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword456'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData);

      expect(response.status).toBe(200);

      // Vérifier que tous les refresh tokens ont été supprimés
      const user = await User.findById(testUser._id);
      expect(user.refreshTokens).toHaveLength(0);
    });
  });

  describe('Token Security', () => {
    it('should not accept expired access token', async () => {
      // Ce test nécessiterait de modifier la configuration JWT pour des tokens très courts
      // ou d'utiliser une bibliothèque pour simuler le temps
      // Pour maintenant, on teste juste avec un token invalide
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should not accept malformed token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer malformed.token.here');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should not accept token without Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', userToken);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should handle multiple login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Simuler plusieurs tentatives échouées
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData);

        expect(response.status).toBe(401);
      }

      // La connexion avec le bon mot de passe devrait toujours fonctionner
      const validResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(validResponse.status).toBe(200);
    });
  });
});