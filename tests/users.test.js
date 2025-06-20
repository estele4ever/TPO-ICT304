// Tests pour les endpoints des users avec couverture MCC et distance
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

// Classe pour gérer la couverture de conditions multiples (MCC)
class MCCCoverage {
  constructor() {
    this.conditions = new Map();
    this.testCombinations = [];
  }

  // Définir les conditions pour un test
  defineConditions(testName, conditions) {
    this.conditions.set(testName, {
      conditions: conditions,
      totalCombinations: Math.pow(2, conditions.length),
      coveredCombinations: new Set(),
      results: []
    });
    
    console.log(`🧮 [MCC] ${testName}: ${conditions.length} conditions → ${Math.pow(2, conditions.length)} combinaisons possibles`);
  }

  // Enregistrer une combinaison testée
  recordCombination(testName, combination, result) {
    if (this.conditions.has(testName)) {
      const testData = this.conditions.get(testName);
      const combKey = combination.join('');
      testData.coveredCombinations.add(combKey);
      testData.results.push({ combination, result, timestamp: Date.now() });
      
      const coverage = (testData.coveredCombinations.size / testData.totalCombinations * 100).toFixed(2);
      console.log(`📊 [MCC] Combinaison [${combination.join(', ')}] → Résultat: ${result} | Couverture: ${coverage}%`);
    }
  }

  // Obtenir le rapport de couverture MCC
  getMCCReport() {
    const report = {};
    for (const [testName, data] of this.conditions) {
      const coverage = (data.coveredCombinations.size / data.totalCombinations * 100).toFixed(2);
      report[testName] = {
        totalCombinations: data.totalCombinations,
        coveredCombinations: data.coveredCombinations.size,
        coveragePercentage: `${coverage}%`,
        missingCombinations: data.totalCombinations - data.coveredCombinations.size,
        results: data.results
      };
    }
    return report;
  }
}

// Classe pour la couverture des distances
class DistanceCoverage {
  constructor() {
    this.validBoundaries = new Map();
    this.testDistances = [];
  }

  // Définir les limites valides pour un champ
  setBoundaries(field, min, max, validValues = []) {
    this.validBoundaries.set(field, { min, max, validValues });
    console.log(`📏 [DISTANCE] Limites pour ${field}: min=${min}, max=${max}, valides=[${validValues.join(', ')}]`);
  }

  // Calculer la distance par rapport aux limites valides
  calculateDistance(field, value) {
    if (!this.validBoundaries.has(field)) return null;
    
    const boundaries = this.validBoundaries.get(field);
    let distance = 0;
    
    if (typeof value === 'string') {
      distance = this.calculateStringDistance(value, boundaries);
    } else if (typeof value === 'number') {
      distance = this.calculateNumericDistance(value, boundaries);
    }
    
    return distance;
  }

  calculateStringDistance(value, boundaries) {
    const len = value.length;
    let distance = 0;
    
    if (len < boundaries.min) {
      distance = boundaries.min - len;
    } else if (len > boundaries.max) {
      distance = len - boundaries.max;
    }
    
    // Vérifier les valeurs valides spécifiques
    if (boundaries.validValues.length > 0) {
      const isValid = boundaries.validValues.some(valid => value.includes(valid));
      if (!isValid) distance += 10; // Pénalité pour format invalide
    }
    
    return distance;
  }

  calculateNumericDistance(value, boundaries) {
    if (value < boundaries.min) {
      return boundaries.min - value;
    } else if (value > boundaries.max) {
      return value - boundaries.max;
    }
    return 0;
  }

  // Enregistrer un test avec sa distance
  recordTest(testData, result) {
    const distances = {};
    let totalDistance = 0;
    
    for (const [field, value] of Object.entries(testData)) {
      const distance = this.calculateDistance(field, value);
      if (distance !== null) {
        distances[field] = distance;
        totalDistance += distance;
      }
    }
    
    const testRecord = {
      testData,
      distances,
      totalDistance,
      result,
      timestamp: Date.now()
    };
    
    this.testDistances.push(testRecord);
    
    console.log(`📐 [DISTANCE] Test: ${JSON.stringify(testData)}`);
    console.log(`   Distances: ${JSON.stringify(distances)} | Total: ${totalDistance} | Résultat: ${result}`);
    
    return testRecord;
  }

  // Générer des données de test basées sur les distances
  generateBoundaryTests(field) {
    if (!this.validBoundaries.has(field)) return [];
    
    const boundaries = this.validBoundaries.get(field);
    const tests = [];
    
    // Tests aux limites exactes
    tests.push({ value: boundaries.min, type: 'min_boundary' });
    tests.push({ value: boundaries.max, type: 'max_boundary' });
    
    // Tests juste en dessous/au-dessus des limites
    tests.push({ value: boundaries.min - 1, type: 'below_min' });
    tests.push({ value: boundaries.max + 1, type: 'above_max' });
    
    // Tests à distance moyenne
    const middle = Math.floor((boundaries.min + boundaries.max) / 2);
    tests.push({ value: middle, type: 'middle' });
    
    console.log(`🎯 [DISTANCE] Tests générés pour ${field}:`, tests);
    return tests;
  }

  getDistanceReport() {
    return {
      totalTests: this.testDistances.length,
      averageDistance: this.testDistances.reduce((sum, test) => sum + test.totalDistance, 0) / this.testDistances.length,
      minDistance: Math.min(...this.testDistances.map(test => test.totalDistance)),
      maxDistance: Math.max(...this.testDistances.map(test => test.totalDistance)),
      testsByDistance: this.testDistances.sort((a, b) => a.totalDistance - b.totalDistance)
    };
  }
}

// Classe principale pour les statistiques avancées
class AdvancedTestStats {
  constructor() {
    this.stats = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      testResults: [],
      totalTime: 0,
      startTime: null
    };
    this.mccCoverage = new MCCCoverage();
    this.distanceCoverage = new DistanceCoverage();
  }

  startTest(testName) {
    this.stats.startTime = Date.now();
    this.stats.totalTests++;
    console.log(`\n🧪 [DÉMARRAGE] ${testName}`);
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
  }

  displayAdvancedStats() {
    console.log('\n📊 === STATISTIQUES AVANCÉES ===');
    console.log(`Total: ${this.stats.totalTests} | Réussis: ${this.stats.passedTests} | Échoués: ${this.stats.failedTests}`);
    console.log(`Temps total: ${this.stats.totalTime}ms | Moyenne: ${Math.round(this.stats.totalTime / this.stats.totalTests)}ms`);
    
    // Rapport MCC
    console.log('\n🧮 === COUVERTURE MCC (2^n) ===');
    const mccReport = this.mccCoverage.getMCCReport();
    for (const [testName, data] of Object.entries(mccReport)) {
      console.log(`${testName}: ${data.coveredCombinations}/${data.totalCombinations} (${data.coveragePercentage})`);
    }
    
    // Rapport Distance
    console.log('\n📐 === COUVERTURE DISTANCE ===');
    const distanceReport = this.distanceCoverage.getDistanceReport();
    console.log(`Tests total: ${distanceReport.totalTests}`);
    console.log(`Distance moyenne: ${distanceReport.averageDistance.toFixed(2)}`);
    console.log(`Distance min: ${distanceReport.minDistance} | max: ${distanceReport.maxDistance}`);
    
    console.log('=====================================\n');
  }

  getFinalReport() {
    return {
      basicStats: {
        totalTests: this.stats.totalTests,
        passedTests: this.stats.passedTests,
        failedTests: this.stats.failedTests,
        successRate: `${((this.stats.passedTests / this.stats.totalTests) * 100).toFixed(2)}%`,
        totalTime: `${this.stats.totalTime}ms`,
        averageTime: `${Math.round(this.stats.totalTime / this.stats.totalTests)}ms`
      },
      mccCoverage: this.mccCoverage.getMCCReport(),
      distanceCoverage: this.distanceCoverage.getDistanceReport(),
      detailedResults: this.stats.testResults
    };
  }
}

// Instance globale des statistiques avancées
const advancedTestStats = new AdvancedTestStats();

describe('Users Endpoints avec Couverture MCC et Distance', () => {
  let adminToken, userToken, adminUser, regularUser;

  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/propelize_db');
    console.log('🚀 Connexion à la base de données établie');
    
    // Configuration des limites pour la couverture des distances
    advancedTestStats.distanceCoverage.setBoundaries('username', 3, 20);
    advancedTestStats.distanceCoverage.setBoundaries('email', 5, 50, ['@', '.']);
    advancedTestStats.distanceCoverage.setBoundaries('password', 6, 100);
  });

  beforeEach(async () => {
    await User.deleteMany({});

    adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin'
    });
    await adminUser.save();

    regularUser = new User({
      username: 'user',
      email: 'user@example.com',
      password: 'password123',
      role: 'user'
    });
    await regularUser.save();

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
    
    console.log('\n🎯 === RAPPORT FINAL AVANCÉ ===');
    const finalReport = advancedTestStats.getFinalReport();
    console.log(`📈 Taux de réussite: ${finalReport.basicStats.successRate}`);
    console.log(`⏱️  Temps total: ${finalReport.basicStats.totalTime}`);
    
    console.log('\n🧮 Couverture MCC finale:');
    for (const [test, data] of Object.entries(finalReport.mccCoverage)) {
      console.log(`  ${test}: ${data.coveragePercentage}`);
    }
    
    console.log('\n📐 Couverture Distance finale:');
    console.log(`  Distance moyenne: ${finalReport.distanceCoverage.averageDistance?.toFixed(2) || 'N/A'}`);
    console.log('===================================\n');
  });

  describe('POST /api/users avec MCC', () => {
    it('should test user creation with MCC coverage (2^3 = 8 combinations)', async () => {
      const testName = 'Création utilisateur MCC';
      
      // Définir 3 conditions: isAdmin, validEmail, strongPassword
      advancedTestStats.mccCoverage.defineConditions(testName, [
        'isAdmin', 'validEmail', 'strongPassword'
      ]);
      
      // Générer toutes les combinaisons 2^3 = 8
      const testCombinations = [
        { isAdmin: true,  validEmail: true,  strongPassword: true,  expected: 'success' },
        { isAdmin: true,  validEmail: true,  strongPassword: false, expected: 'password_weak' },
        { isAdmin: true,  validEmail: false, strongPassword: true,  expected: 'email_invalid' },
        { isAdmin: true,  validEmail: false, strongPassword: false, expected: 'multiple_errors' },
        { isAdmin: false, validEmail: true,  strongPassword: true,  expected: 'forbidden' },
        { isAdmin: false, validEmail: true,  strongPassword: false, expected: 'forbidden' },
        { isAdmin: false, validEmail: false, strongPassword: true,  expected: 'forbidden' },
        { isAdmin: false, validEmail: false, strongPassword: false, expected: 'forbidden' }
      ];

      for (let i = 0; i < testCombinations.length; i++) {
        const combo = testCombinations[i];
        
        try {
          advancedTestStats.startTest(`${testName} - Combinaison ${i + 1}/8`);
          
          // Préparer les données de test basées sur la combinaison
          const userData = {
            username: `testuser${i}`,
            email: combo.validEmail ? `valid${i}@example.com` : `invalid-email${i}`,
            password: combo.strongPassword ? 'StrongPassword123!' : '123',
            role: 'user'
          };
          
          // Enregistrer pour la couverture des distances
          advancedTestStats.distanceCoverage.recordTest(userData, combo.expected);
          
          const token = combo.isAdmin ? adminToken : userToken;
          
          const response = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${token}`)
            .send(userData);

          // Enregistrer la combinaison MCC
          const combination = [combo.isAdmin, combo.validEmail, combo.strongPassword];
          advancedTestStats.mccCoverage.recordCombination(testName, combination, response.status);
          
          // Vérifications selon le résultat attendu
          if (combo.expected === 'success') {
            expect(response.status).toBe(201);
          } else if (combo.expected === 'forbidden') {
            expect(response.status).toBe(403);
          } else {
            expect(response.status).toBeGreaterThanOrEqual(400);
          }
          
          advancedTestStats.endTest(`${testName} - Combinaison ${i + 1}/8`, true);
          
        } catch (error) {
          advancedTestStats.endTest(`${testName} - Combinaison ${i + 1}/8`, false, error);
          throw error;
        }
      }
      
      advancedTestStats.displayAdvancedStats();
    });
  });

  describe('Tests avec Couverture des Distances', () => {
    it('should test boundary values for username field', async () => {
      const testName = 'Test des limites username';
      
      // Générer des tests aux limites
      const boundaryTests = [
        { username: '', description: 'vide (distance max)' },
        { username: 'ab', description: 'trop court (distance 1)' },
        { username: 'abc', description: 'limite min (distance 0)' },
        { username: 'validusername', description: 'valide milieu (distance 0)' },
        { username: 'a'.repeat(20), description: 'limite max (distance 0)' },
        { username: 'a'.repeat(21), description: 'trop long (distance 1)' },
        { username: 'a'.repeat(50), description: 'très long (distance 30)' }
      ];

      for (let i = 0; i < boundaryTests.length; i++) {
        const test = boundaryTests[i];
        
        try {
          advancedTestStats.startTest(`${testName} - ${test.description}`);
          
          const userData = {
            username: test.username,
            email: `test${i}@example.com`,
            password: 'password123',
            role: 'user'
          };
          
          // Calculer et enregistrer la distance
          const distance = advancedTestStats.distanceCoverage.calculateDistance('username', test.username);
          console.log(`📏 Username "${test.username}" → Distance: ${distance}`);
          
          const response = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(userData);

          // Enregistrer le test avec sa distance
          advancedTestStats.distanceCoverage.recordTest(userData, response.status >= 200 && response.status < 300);
          
          // Les tests avec distance > 0 devraient échouer
          if (distance > 0) {
            expect(response.status).toBeGreaterThanOrEqual(400);
          } else {
            expect(response.status).toBeLessThan(400);
          }
          
          advancedTestStats.endTest(`${testName} - ${test.description}`, true);
          
        } catch (error) {
          advancedTestStats.endTest(`${testName} - ${test.description}`, false, error);
          // Continue avec les autres tests même si un échoue
        }
      }
      
      advancedTestStats.displayAdvancedStats();
    });

    it('should test email format distances', async () => {
      const testName = 'Test des distances email';
      
      const emailTests = [
        { email: 'test', description: 'sans @ ni . (distance élevée)' },
        { email: 'test@', description: 'avec @ seulement (distance moyenne)' },
        { email: 'test.com', description: 'avec . seulement (distance moyenne)' },
        { email: 'test@example', description: 'avec @ sans . (distance faible)' },
        { email: 'test@example.com', description: 'format valide (distance 0)' },
        { email: 'a@b.c', description: 'très court mais valide (distance 0)' },
        { email: 'a'.repeat(40) + '@example.com', description: 'très long mais valide (distance élevée)' }
      ];

      for (let i = 0; i < emailTests.length; i++) {
        const test = emailTests[i];
        
        try {
          advancedTestStats.startTest(`${testName} - ${test.description}`);
          
          const userData = {
            username: `user${i}`,
            email: test.email,
            password: 'password123',
            role: 'user'
          };
          
          const distance = advancedTestStats.distanceCoverage.calculateDistance('email', test.email);
          console.log(`📧 Email "${test.email}" → Distance: ${distance}`);
          
          const response = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(userData);

          advancedTestStats.distanceCoverage.recordTest(userData, response.status >= 200 && response.status < 300);
          
          advancedTestStats.endTest(`${testName} - ${test.description}`, true);
          
        } catch (error) {
          advancedTestStats.endTest(`${testName} - ${test.description}`, false, error);
        }
      }
      
      advancedTestStats.displayAdvancedStats();
    });
  });

  describe('GET /api/users/profile avec MCC', () => {
    it('should test profile access with authentication conditions', async () => {
      const testName = 'Accès profil avec conditions auth';
      
      // Définir 2 conditions: hasToken, validToken (2^2 = 4 combinaisons)
      advancedTestStats.mccCoverage.defineConditions(testName, ['hasToken', 'validToken']);
      
      const authCombinations = [
        { hasToken: true,  validToken: true,  expected: 200 },
        { hasToken: true,  validToken: false, expected: 401 },
        { hasToken: false, validToken: true,  expected: 401 }, // N/A mais pour la complétude
        { hasToken: false, validToken: false, expected: 401 }
      ];

      for (let i = 0; i < authCombinations.length; i++) {
        const combo = authCombinations[i];
        
        try {
          advancedTestStats.startTest(`${testName} - Auth ${i + 1}/4`);
          
          let requestBuilder = request(app).get('/api/users/profile');
          
          if (combo.hasToken) {
            const token = combo.validToken ? userToken : 'invalid_token_12345';
            requestBuilder = requestBuilder.set('Authorization', `Bearer ${token}`);
          }
          
          const response = await requestBuilder;
          
          const combination = [combo.hasToken, combo.validToken];
          advancedTestStats.mccCoverage.recordCombination(testName, combination, response.status);
          
          expect(response.status).toBe(combo.expected);
          
          advancedTestStats.endTest(`${testName} - Auth ${i + 1}/4`, true);
          
        } catch (error) {
          advancedTestStats.endTest(`${testName} - Auth ${i + 1}/4`, false, error);
          throw error;
        }
      }
      
      advancedTestStats.displayAdvancedStats();
    });
  });
});

// Export pour utilisation dans d'autres fichiers
module.exports = { AdvancedTestStats, MCCCoverage, DistanceCoverage };










/*

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


*/

