// Tests pour les endpoints des users avec statistiques
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

// Classe pour gérer les statistiques de test
class TestStats {
  constructor() {
    this.stats = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      testResults: [],
      totalTime: 0,
      startTime: null
    };
  }

  startTest(testName) {
    this.stats.startTime = Date.now();
    this.stats.totalTests++;
    console.log(`🧪 [DÉMARRAGE] ${testName}`);
  }

  endTest(testName, success, error = null) {
    const endTime = Date.now();
    const duration = endTime - this.stats.startTime;
    this.stats.totalTime += duration;

    const result = {
      testName,
      success,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      error: error?.message || null
    };

    this.stats.testResults.push(result);

    if (success) {
      this.stats.passedTests++;
      console.log(`✅ [SUCCÈS] ${testName} - ${duration}ms`);
    } else {
      this.stats.failedTests++;
      console.log(`❌ [ÉCHEC] ${testName} - ${duration}ms`);
      if (error) console.log(`   Erreur: ${error.message}`);
    }

    // Afficher les statistiques en temps réel
    this.displayCurrentStats();
  }

  displayCurrentStats() {
    console.log('\n📊 === STATISTIQUES ACTUELLES ===');
    console.log(`Total des tests: ${this.stats.totalTests}`);
    console.log(`Réussis: ${this.stats.passedTests} ✅`);
    console.log(`Échoués: ${this.stats.failedTests} ❌`);
    console.log(`Temps total: ${this.stats.totalTime}ms`);
    console.log(`Temps moyen: ${Math.round(this.stats.totalTime / this.stats.totalTests)}ms`);
    console.log('=====================================\n');
  }

  getFinalReport() {
    return {
      summary: {
        totalTests: this.stats.totalTests,
        passedTests: this.stats.passedTests,
        failedTests: this.stats.failedTests,
        successRate: `${((this.stats.passedTests / this.stats.totalTests) * 100).toFixed(2)}%`,
        totalTime: `${this.stats.totalTime}ms`,
        averageTime: `${Math.round(this.stats.totalTime / this.stats.totalTests)}ms`
      },
      detailedResults: this.stats.testResults
    };
  }
}

// Instance globale des statistiques
const testStats = new TestStats();

// Middleware pour ajouter les stats aux réponses (à ajouter dans votre app.js)
const addStatsToResponse = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Ajouter les statistiques aux réponses si c'est un test
    if (process.env.NODE_ENV === 'test' && req.headers['x-test-stats'] === 'true') {
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;
      responseData.testStats = testStats.getFinalReport();
      return originalSend.call(this, responseData);
    }
    return originalSend.call(this, data);
  };
  
  next();
};

describe('Users Endpoints', () => {
  let adminToken, userToken, adminUser, regularUser;

  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/propelize_db');
    console.log('🚀 Connexion à la base de données établie');
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
    
    // Afficher le rapport final
    console.log('\n🎯 === RAPPORT FINAL DES TESTS ===');
    const finalReport = testStats.getFinalReport();
    console.log(`📈 Taux de réussite: ${finalReport.summary.successRate}`);
    console.log(`⏱️  Temps total d'exécution: ${finalReport.summary.totalTime}`);
    console.log(`📊 Temps moyen par test: ${finalReport.summary.averageTime}`);
    console.log('===================================\n');
  });

  describe('POST /api/users', () => {
    it('should create user as admin', async () => {
      const testName = 'Création utilisateur par admin';
      
      try {
        testStats.startTest(testName);
        
        const newUser = {
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
          role: 'user'
        };

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-test-stats', 'true') // Header pour activer les stats
          .send(newUser);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.username).toBe('newuser');
        
        testStats.endTest(testName, true);
        
        // Afficher les détails de la réponse
        console.log(`📥 Réponse: Status ${response.status}, User: ${response.body.data?.username}`);
        
      } catch (error) {
        testStats.endTest(testName, false, error);
        throw error;
      }
    });

    it('should reject user creation by regular user', async () => {
      const testName = 'Rejet création par utilisateur régulier';
      
      try {
        testStats.startTest(testName);
        
        const newUser = {
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${userToken}`)
          .set('x-test-stats', 'true')
          .send(newUser);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        
        testStats.endTest(testName, true);
        
        console.log(`📥 Réponse: Status ${response.status}, Message: ${response.body.message}`);
        
      } catch (error) {
        testStats.endTest(testName, false, error);
        throw error;
      }
    });
  });

  describe('GET /api/users/profile', () => {
    it('should get user profile', async () => {
      const testName = 'Récupération profil utilisateur';
      
      try {
        testStats.startTest(testName);
        
        const response = await request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .set('x-test-stats', 'true');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.username).toBe('user');
        
        testStats.endTest(testName, true);
        
        console.log(`📥 Réponse: Status ${response.status}, Username: ${response.body.data?.username}`);
        
      } catch (error) {
        testStats.endTest(testName, false, error);
        throw error;
      }
    });

    it('should reject unauthenticated request', async () => {
      const testName = 'Rejet requête non authentifiée';
      
      try {
        testStats.startTest(testName);
        
        const response = await request(app)
          .get('/api/users/profile')
          .set('x-test-stats', 'true');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        
        testStats.endTest(testName, true);
        
        console.log(`📥 Réponse: Status ${response.status}, Message: ${response.body.message}`);
        
      } catch (error) {
        testStats.endTest(testName, false, error);
        throw error;
      }
    });
  });
});

// Export pour utilisation dans d'autres fichiers de test
module.exports = { TestStats, addStatsToResponse };




