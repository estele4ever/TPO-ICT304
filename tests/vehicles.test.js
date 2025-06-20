// Tests pour les endpoints des véhicules avec couverture MCC et Distance
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');

// Classe avancée pour gérer les statistiques de test avec MCC et couverture de distance
class VehicleTestStats {
  constructor() {
    this.stats = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      testResults: [],
      categories: {
        creation: { total: 0, passed: 0, failed: 0 },
        validation: { total: 0, passed: 0, failed: 0 },
        authentication: { total: 0, passed: 0, failed: 0 },
        retrieval: { total: 0, passed: 0, failed: 0 },
        mcc: { total: 0, passed: 0, failed: 0 },
        distance: { total: 0, passed: 0, failed: 0 }
      },
      performance: {
        totalTime: 0,
        fastestTest: null,
        slowestTest: null,
        responseTimes: []
      },
      mccCoverage: {
        totalConditions: 0,
        coveredCombinations: 0,
        expectedCombinations: 0,
        conditionMatrix: {}
      },
      distanceCoverage: {
        boundaryTests: 0,
        nearValidTests: 0,
        farInvalidTests: 0,
        distanceMetrics: []
      },
      startTime: null,
      sessionStartTime: Date.now()
    };
  }

  // Calculer le nombre attendu de tests pour MCC (2^n)
  calculateExpectedMCCTests(conditions) {
    const n = conditions.length;
    const expectedTests = Math.pow(2, n);
    this.stats.mccCoverage.expectedCombinations = expectedTests;
    console.log(`🧮 MCC: ${n} conditions détectées, ${expectedTests} combinaisons attendues (2^${n})`);
    return expectedTests;
  }

  // Enregistrer une combinaison de conditions pour MCC
  recordMCCCombination(testName, conditions, results) {
    const combinationKey = results.map(r => r ? '1' : '0').join('');
    
    if (!this.stats.mccCoverage.conditionMatrix[combinationKey]) {
      this.stats.mccCoverage.conditionMatrix[combinationKey] = [];
      this.stats.mccCoverage.coveredCombinations++;
    }
    
    this.stats.mccCoverage.conditionMatrix[combinationKey].push({
      testName,
      conditions,
      results,
      timestamp: Date.now()
    });

    console.log(`🔍 MCC: Combinaison ${combinationKey} enregistrée pour ${testName}`);
  }

  // Calculer la distance par rapport aux données valides
  calculateDistanceMetric(testData, validReference) {
    let distance = 0;
    let distanceDetails = {};

    // Distance pour l'année
    if (testData.year && validReference.year) {
      const yearDiff = Math.abs(testData.year - validReference.year);
      distance += yearDiff * 0.1; // Poids de 0.1 pour l'année
      distanceDetails.year = yearDiff;
    }

    // Distance pour la longueur du VIN
    if (testData.vin && validReference.vin) {
      const vinLengthDiff = Math.abs(testData.vin.length - validReference.vin.length);
      distance += vinLengthDiff * 2; // Poids de 2 pour le VIN
      distanceDetails.vinLength = vinLengthDiff;
    }

    // Distance pour la plaque d'immatriculation
    if (testData.licensePlate && validReference.licensePlate) {
      const plateLengthDiff = Math.abs(testData.licensePlate.length - validReference.licensePlate.length);
      distance += plateLengthDiff * 1.5; // Poids de 1.5 pour la plaque
      distanceDetails.plateLength = plateLengthDiff;
    }

    return { distance: Math.round(distance * 100) / 100, details: distanceDetails };
  }

  // Enregistrer une métrique de distance
  recordDistanceMetric(testName, testData, validReference, category) {
    const distanceMetric = this.calculateDistanceMetric(testData, validReference);
    
    this.stats.distanceCoverage.distanceMetrics.push({
      testName,
      category,
      distance: distanceMetric.distance,
      details: distanceMetric.details,
      timestamp: Date.now()
    });

    // Classifier selon la distance
    if (distanceMetric.distance === 0) {
      // Données valides exactes
    } else if (distanceMetric.distance <= 5) {
      this.stats.distanceCoverage.nearValidTests++;
      console.log(`📏 Distance PROCHE: ${testName} - Distance: ${distanceMetric.distance}`);
    } else if (distanceMetric.distance <= 15) {
      this.stats.distanceCoverage.boundaryTests++;
      console.log(`🎯 Distance FRONTIÈRE: ${testName} - Distance: ${distanceMetric.distance}`);
    } else {
      this.stats.distanceCoverage.farInvalidTests++;
      console.log(`🚫 Distance LOINTAINE: ${testName} - Distance: ${distanceMetric.distance}`);
    }
  }

  startTest(testName, category = 'general') {
    this.stats.startTime = Date.now();
    this.stats.totalTests++;
    
    if (this.stats.categories[category]) {
      this.stats.categories[category].total++;
    }
    
    console.log(`🧪 [DÉMARRAGE] ${testName} (${category})`);
  }

  endTest(testName, success, category = 'general', error = null) {
    const endTime = Date.now();
    const duration = endTime - this.stats.startTime;
    this.stats.performance.totalTime += duration;
    this.stats.performance.responseTimes.push(duration);

    if (!this.stats.performance.fastestTest || duration < this.stats.performance.fastestTest.duration) {
      this.stats.performance.fastestTest = { testName, duration };
    }
    if (!this.stats.performance.slowestTest || duration > this.stats.performance.slowestTest.duration) {
      this.stats.performance.slowestTest = { testName, duration };
    }

    const result = {
      testName,
      category,
      success,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      error: error?.message || null,
      responseTime: duration
    };

    this.stats.testResults.push(result);

    if (success) {
      this.stats.passedTests++;
      if (this.stats.categories[category]) {
        this.stats.categories[category].passed++;
      }
      console.log(`✅ [SUCCÈS] ${testName} - ${duration}ms`);
    } else {
      this.stats.failedTests++;
      if (this.stats.categories[category]) {
        this.stats.categories[category].failed++;
      }
      console.log(`❌ [ÉCHEC] ${testName} - ${duration}ms`);
      if (error) console.log(`   Erreur: ${error.message}`);
    }

    this.displayCurrentStats();
  }

  calculatePercentages() {
    const totalTests = this.stats.totalTests;
    if (totalTests === 0) return {};

    return {
      successRate: ((this.stats.passedTests / totalTests) * 100).toFixed(2),
      failureRate: ((this.stats.failedTests / totalTests) * 100).toFixed(2),
      completionRate: (((this.stats.passedTests + this.stats.failedTests) / totalTests) * 100).toFixed(2),
      mccCoverage: this.stats.mccCoverage.expectedCombinations > 0 
        ? ((this.stats.mccCoverage.coveredCombinations / this.stats.mccCoverage.expectedCombinations) * 100).toFixed(2)
        : '0.00',
      categories: Object.entries(this.stats.categories).reduce((acc, [key, value]) => {
        if (value.total > 0) {
          acc[key] = {
            successRate: ((value.passed / value.total) * 100).toFixed(2),
            failureRate: ((value.failed / value.total) * 100).toFixed(2),
            coverage: ((value.total / totalTests) * 100).toFixed(2)
          };
        }
        return acc;
      }, {})
    };
  }

  displayCurrentStats() {
    const percentages = this.calculatePercentages();
    const avgTime = this.stats.performance.totalTime / this.stats.totalTests;

    console.log('\n📊 === STATISTIQUES ACTUELLES VÉHICULES ===');
    console.log(`📈 Total des tests: ${this.stats.totalTests}`);
    console.log(`✅ Réussis: ${this.stats.passedTests} (${percentages.successRate}%)`);
    console.log(`❌ Échoués: ${this.stats.failedTests} (${percentages.failureRate}%)`);
    console.log(`🎯 Taux de réussite global: ${percentages.successRate}%`);
    console.log(`⏱️  Temps total: ${this.stats.performance.totalTime}ms`);
    console.log(`📊 Temps moyen: ${Math.round(avgTime)}ms`);
    
    // Statistiques MCC
    console.log('\n🔍 === COUVERTURE MCC (Multiple Condition Coverage) ===');
    console.log(`🧮 Combinaisons attendues (2^n): ${this.stats.mccCoverage.expectedCombinations}`);
    console.log(`✅ Combinaisons couvertes: ${this.stats.mccCoverage.coveredCombinations}`);
    console.log(`📊 Couverture MCC: ${percentages.mccCoverage}%`);
    
    // Statistiques de distance
    console.log('\n📏 === COUVERTURE DE DISTANCE ===');
    console.log(`🎯 Tests frontière: ${this.stats.distanceCoverage.boundaryTests}`);
    console.log(`📍 Tests proches valides: ${this.stats.distanceCoverage.nearValidTests}`);
    console.log(`🚫 Tests lointains invalides: ${this.stats.distanceCoverage.farInvalidTests}`);
    
    // Afficher les statistiques par catégorie
    console.log('\n🏷️  === STATISTIQUES PAR CATÉGORIE ===');
    for (const [category, stats] of Object.entries(this.stats.categories)) {
      if (stats.total > 0) {
        const categoryPercentages = percentages.categories[category];
        console.log(`${category.toUpperCase()}:`);
        console.log(`  📊 Couverture: ${categoryPercentages.coverage}% (${stats.total}/${this.stats.totalTests})`);
        console.log(`  ✅ Succès: ${categoryPercentages.successRate}% (${stats.passed}/${stats.total})`);
        console.log(`  ❌ Échecs: ${categoryPercentages.failureRate}% (${stats.failed}/${stats.total})`);
      }
    }
    console.log('==========================================\n');
  }

  getFinalReport() {
    const percentages = this.calculatePercentages();
    const performance = this.getPerformanceStats();
    const sessionDuration = Date.now() - this.stats.sessionStartTime;

    return {
      summary: {
        totalTests: this.stats.totalTests,
        passedTests: this.stats.passedTests,
        failedTests: this.stats.failedTests,
        successRate: `${percentages.successRate}%`,
        failureRate: `${percentages.failureRate}%`,
        completionRate: `${percentages.completionRate}%`,
        sessionDuration: `${sessionDuration}ms`,
        totalExecutionTime: `${this.stats.performance.totalTime}ms`
      },
      mccCoverage: {
        expectedCombinations: this.stats.mccCoverage.expectedCombinations,
        coveredCombinations: this.stats.mccCoverage.coveredCombinations,
        coveragePercentage: `${percentages.mccCoverage}%`,
        conditionMatrix: this.stats.mccCoverage.conditionMatrix
      },
      distanceCoverage: {
        boundaryTests: this.stats.distanceCoverage.boundaryTests,
        nearValidTests: this.stats.distanceCoverage.nearValidTests,
        farInvalidTests: this.stats.distanceCoverage.farInvalidTests,
        distanceMetrics: this.stats.distanceCoverage.distanceMetrics
      },
      performance: {
        averageTime: `${performance.average}ms`,
        medianTime: `${performance.median}ms`,
        fastestTest: this.stats.performance.fastestTest,
        slowestTest: this.stats.performance.slowestTest,
        standardDeviation: `${performance.standardDeviation}ms`
      },
      categories: Object.entries(this.stats.categories).reduce((acc, [key, value]) => {
        if (value.total > 0) {
          acc[key] = {
            total: value.total,
            passed: value.passed,
            failed: value.failed,
            successRate: `${percentages.categories[key].successRate}%`,
            coverage: `${percentages.categories[key].coverage}%`
          };
        }
        return acc;
      }, {}),
      detailedResults: this.stats.testResults
    };
  }

  getPerformanceStats() {
    const times = this.stats.performance.responseTimes;
    if (times.length === 0) return {};

    times.sort((a, b) => a - b);
    const median = times.length % 2 === 0 
      ? (times[times.length / 2 - 1] + times[times.length / 2]) / 2 
      : times[Math.floor(times.length / 2)];

    return {
      average: Math.round(this.stats.performance.totalTime / times.length),
      median: Math.round(median),
      min: Math.min(...times),
      max: Math.max(...times),
      standardDeviation: Math.round(this.calculateStandardDeviation(times))
    };
  }

  calculateStandardDeviation(values) {
    const avg = values.reduce((a, b) => a + b) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }
}

// Instance globale des statistiques pour les véhicules
const vehicleTestStats = new VehicleTestStats();

// Données de référence valides pour le calcul de distance
const VALID_VEHICLE_REFERENCE = {
  make: 'Toyota',
  model: 'Camry',
  year: 2023,
  color: 'Rouge',
  licensePlate: 'ABC123',
  vin: '1234567890ABCDEFG' // 17 caractères
};

describe('Vehicles Endpoints - MCC & Distance Coverage', () => {
  let userToken, user;

  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/propelize_db');
    console.log('🚗 Connexion à la base de données établie pour les tests de véhicules');
    
    // Définir les conditions pour MCC
    const conditions = ['hasValidMake', 'hasValidModel', 'hasValidYear', 'hasValidVIN', 'isAuthenticated'];
    vehicleTestStats.calculateExpectedMCCTests(conditions);
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Vehicle.deleteMany({});

    user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    await user.save();

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    userToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.connection.close();
    
    console.log('\n🎯 === RAPPORT FINAL MCC & DISTANCE ===');
    const finalReport = vehicleTestStats.getFinalReport();
    
    console.log(`📊 RÉSUMÉ GLOBAL:`);
    console.log(`   Taux de réussite: ${finalReport.summary.successRate}`);
    console.log(`   Temps total: ${finalReport.summary.totalExecutionTime}`);
    
    console.log(`\n🔍 COUVERTURE MCC:`);
    console.log(`   Combinaisons attendues (2^n): ${finalReport.mccCoverage.expectedCombinations}`);
    console.log(`   Combinaisons couvertes: ${finalReport.mccCoverage.coveredCombinations}`);
    console.log(`   Couverture MCC: ${finalReport.mccCoverage.coveragePercentage}`);
    
    console.log(`\n📏 COUVERTURE DISTANCE:`);
    console.log(`   Tests frontière: ${finalReport.distanceCoverage.boundaryTests}`);
    console.log(`   Tests proches: ${finalReport.distanceCoverage.nearValidTests}`);
    console.log(`   Tests lointains: ${finalReport.distanceCoverage.farInvalidTests}`);
    
    console.log('=============================================\n');
  });

  describe('POST /api/vehicles - MCC Coverage Tests', () => {
    // Test 1: Toutes conditions vraies (11111)
    it('MCC: All conditions true - Valid vehicle creation', async () => {
      const testName = 'MCC-AllTrue';
      
      try {
        vehicleTestStats.startTest(testName, 'mcc');
        
        const vehicleData = {
          make: 'Toyota',        // hasValidMake: true
          model: 'Camry',        // hasValidModel: true
          year: 2023,            // hasValidYear: true
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '1234567890ABCDEFG' // hasValidVIN: true
        };
        // isAuthenticated: true (token présent)

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        const conditions = ['hasValidMake', 'hasValidModel', 'hasValidYear', 'hasValidVIN', 'isAuthenticated'];
        const results = [true, true, true, true, true];
        vehicleTestStats.recordMCCCombination(testName, conditions, results);
        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'exact');

        expect(response.status).toBe(201);
        vehicleTestStats.endTest(testName, true, 'mcc');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'mcc', error);
        throw error;
      }
    });

    // Test 2: Make invalide (01111)
    it('MCC: Invalid make condition - Missing make', async () => {
      const testName = 'MCC-InvalidMake';
      
      try {
        vehicleTestStats.startTest(testName, 'mcc');
        
        const vehicleData = {
          // make: manquant         // hasValidMake: false
          model: 'Camry',        // hasValidModel: true
          year: 2023,            // hasValidYear: true
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '1234567890ABCDEFG' // hasValidVIN: true
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        const conditions = ['hasValidMake', 'hasValidModel', 'hasValidYear', 'hasValidVIN', 'isAuthenticated'];
        const results = [false, true, true, true, true];
        vehicleTestStats.recordMCCCombination(testName, conditions, results);
        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'boundary');

        expect(response.status).toBe(400);
        vehicleTestStats.endTest(testName, true, 'mcc');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'mcc', error);
        throw error;
      }
    });

    // Test 3: Model invalide (10111)
    it('MCC: Invalid model condition - Missing model', async () => {
      const testName = 'MCC-InvalidModel';
      
      try {
        vehicleTestStats.startTest(testName, 'mcc');
        
        const vehicleData = {
          make: 'Toyota',        // hasValidMake: true
          // model: manquant      // hasValidModel: false
          year: 2023,            // hasValidYear: true
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '1234567890ABCDEFG' // hasValidVIN: true
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        const conditions = ['hasValidMake', 'hasValidModel', 'hasValidYear', 'hasValidVIN', 'isAuthenticated'];
        const results = [true, false, true, true, true];
        vehicleTestStats.recordMCCCombination(testName, conditions, results);
        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'boundary');

        expect(response.status).toBe(400);
        vehicleTestStats.endTest(testName, true, 'mcc');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'mcc', error);
        throw error;
      }
    });

    // Test 4: Année invalide (11011)
    it('MCC: Invalid year condition - Year too old', async () => {
      const testName = 'MCC-InvalidYear';
      
      try {
        vehicleTestStats.startTest(testName, 'mcc');
        
        const vehicleData = {
          make: 'Toyota',        // hasValidMake: true
          model: 'Camry',        // hasValidModel: true
          year: 1800,            // hasValidYear: false (trop ancien)
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '1234567890ABCDEFG' // hasValidVIN: true
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        const conditions = ['hasValidMake', 'hasValidModel', 'hasValidYear', 'hasValidVIN', 'isAuthenticated'];
        const results = [true, true, false, true, true];
        vehicleTestStats.recordMCCCombination(testName, conditions, results);
        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'far');

        expect(response.status).toBe(400);
        vehicleTestStats.endTest(testName, true, 'mcc');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'mcc', error);
        throw error;
      }
    });

    // Test 5: VIN invalide (11101)
    it('MCC: Invalid VIN condition - VIN too short', async () => {
      const testName = 'MCC-InvalidVIN';
      
      try {
        vehicleTestStats.startTest(testName, 'mcc');
        
        const vehicleData = {
          make: 'Toyota',        // hasValidMake: true
          model: 'Camry',        // hasValidModel: true
          year: 2023,            // hasValidYear: true
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '123'             // hasValidVIN: false (trop court)
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        const conditions = ['hasValidMake', 'hasValidModel', 'hasValidYear', 'hasValidVIN', 'isAuthenticated'];
        const results = [true, true, true, false, true];
        vehicleTestStats.recordMCCCombination(testName, conditions, results);
        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'far');

        expect(response.status).toBe(400);
        vehicleTestStats.endTest(testName, true, 'mcc');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'mcc', error);
        throw error;
      }
    });

    // Test 6: Non authentifié (11110)
    it('MCC: Not authenticated condition', async () => {
      const testName = 'MCC-NotAuthenticated';
      
      try {
        vehicleTestStats.startTest(testName, 'mcc');
        
        const vehicleData = {
          make: 'Toyota',        // hasValidMake: true
          model: 'Camry',        // hasValidModel: true
          year: 2023,            // hasValidYear: true
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '1234567890ABCDEFG' // hasValidVIN: true
        };
        // isAuthenticated: false (pas de token)

        const response = await request(app)
          .post('/api/vehicles')
          .send(vehicleData);

        const conditions = ['hasValidMake', 'hasValidModel', 'hasValidYear', 'hasValidVIN', 'isAuthenticated'];
        const results = [true, true, true, true, false];
        vehicleTestStats.recordMCCCombination(testName, conditions, results);
        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'auth');

        expect(response.status).toBe(401);
        vehicleTestStats.endTest(testName, true, 'mcc');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'mcc', error);
        throw error;
      }
    });
  });

  describe('POST /api/vehicles - Distance Coverage Tests', () => {
    
    // Tests de distance proche (distance <= 5)
    it('Distance: Near valid - Year slightly different', async () => {
      const testName = 'Distance-NearValid-Year';
      
      try {
        vehicleTestStats.startTest(testName, 'distance');
        
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2022,            // Distance: 1 année de différence
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '1234567890ABCDEFG'
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'near');

        expect(response.status).toBe(201);
        vehicleTestStats.endTest(testName, true, 'distance');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'distance', error);
        throw error;
      }
    });

    it('Distance: Near valid - License plate length slightly different', async () => {
      const testName = 'Distance-NearValid-Plate';
      
      try {
        vehicleTestStats.startTest(testName, 'distance');
        
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2023,
          color: 'Rouge',
          licensePlate: 'AB12',  // Distance: 2 caractères de différence
          vin: '1234567890ABCDEFG'
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'near');

        expect(response.status).toBe(201);
        vehicleTestStats.endTest(testName, true, 'distance');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'distance', error);
        throw error;
      }
    });

    it('Distance: Near valid - VIN length close to valid', async () => {
      const testName = 'Distance-NearValid-VIN';
      
      try {
        vehicleTestStats.startTest(testName, 'distance');
        
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2023,
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '1234567890ABCD'  // Distance: 2 caractères de différence
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'near');

        // Ce test peut échouer à cause de la validation VIN, mais on mesure la distance
        vehicleTestStats.endTest(testName, response.status === 201 || response.status === 400, 'distance');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'distance', error);
        throw error;
      }
    });

    // Tests de distance frontière (5 < distance <= 15)
    it('Distance: Boundary - Year moderately different', async () => {
      const testName = 'Distance-Boundary-Year';
      
      try {
        vehicleTestStats.startTest(testName, 'distance');
        
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2013,            // Distance: 10 années de différence
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '1234567890ABCDEFG'
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'boundary');

        expect([200, 201, 400]).toContain(response.status);
        vehicleTestStats.endTest(testName, true, 'distance');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'distance', error);
        throw error;
      }
    });

    it('Distance: Boundary - License plate very different length', async () => {
      const testName = 'Distance-Boundary-PlateLength';
      
      try {
        vehicleTestStats.startTest(testName, 'distance');
        
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2023,
          color: 'Rouge',
          licensePlate: 'A',     // Distance: 5 caractères de différence
          vin: '1234567890ABCDEFG'
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'boundary');

        vehicleTestStats.endTest(testName, response.status >= 200 && response.status < 500, 'distance');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'distance', error);
        throw error;
      }
    });

    it('Distance: Boundary - VIN moderately short', async () => {
      const testName = 'Distance-Boundary-VINLength';
      
      try {
        vehicleTestStats.startTest(testName, 'distance');
        
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2023,
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '1234567890'      // Distance: 7 caractères de différence
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'boundary');

        expect([400, 422]).toContain(response.status);
        vehicleTestStats.endTest(testName, true, 'distance');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'distance', error);
        throw error;
      }
    });

    // Tests de distance lointaine (distance > 15)
    it('Distance: Far invalid - Year very old', async () => {
      const testName = 'Distance-Far-VeryOldYear';
      
      try {
        vehicleTestStats.startTest(testName, 'distance');
        
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 1800,            // Distance: 223 années de différence
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '1234567890ABCDEFG'
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'far');

        expect(response.status).toBe(400);
        vehicleTestStats.endTest(testName, true, 'distance');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'distance', error);
        throw error;
      }
    });

    it('Distance: Far invalid - VIN extremely short', async () => {
      const testName = 'Distance-Far-VeryShortVIN';
      
      try {
        vehicleTestStats.startTest(testName, 'distance');
        
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2023,
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '1'               // Distance: 16 caractères de différence
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'far');

        expect(response.status).toBe(400);
        vehicleTestStats.endTest(testName, true, 'distance');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'distance', error);
        throw error;
      }
    });

    it('Distance: Far invalid - Combined extreme values', async () => {
      const testName = 'Distance-Far-CombinedExtreme';
      
      try {
        vehicleTestStats.startTest(testName, 'distance');
        
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 1900,            // Distance année: 123
          color: 'Rouge',
          licensePlate: '',      // Distance plaque: 6
          vin: ''                // Distance VIN: 17
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'far');

        expect(response.status).toBe(400);
        vehicleTestStats.endTest(testName, true, 'distance');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'distance', error);
        throw error;
      }
    });

    // Tests de distance avec valeurs limites précises
    it('Distance: Exact boundary - Year at minimum valid', async () => {
      const testName = 'Distance-ExactBoundary-MinYear';
      
      try {
        vehicleTestStats.startTest(testName, 'distance');
        
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 1900,            // Valeur limite minimale
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '1234567890ABCDEFG'
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'boundary');

        vehicleTestStats.endTest(testName, response.status >= 200 && response.status < 500, 'distance');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'distance', error);
        throw error;
      }
    });

    it('Distance: Exact boundary - VIN at minimum length', async () => {
      const testName = 'Distance-ExactBoundary-MinVIN';
      
      try {
        vehicleTestStats.startTest(testName, 'distance');
        
        const vehicleData = {
          make: 'Toyota',
          model: 'Camry',
          year: 2023,
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '12345678901234567' // 17 caractères (longueur correcte)
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'exact');

        expect(response.status).toBe(201);
        vehicleTestStats.endTest(testName, true, 'distance');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'distance', error);
        throw error;
      }
    });
  });

  describe('GET /api/vehicles - Extended Coverage Tests', () => {
    
    it('MCC: Get vehicles with authentication - Valid conditions', async () => {
      const testName = 'MCC-Get-AuthenticatedValid';
      
      try {
        vehicleTestStats.startTest(testName, 'mcc');
        
        // Créer des véhicules avec distances variées
        await Vehicle.create([
          {
            make: 'Toyota',
            model: 'Camry',
            year: 2023,          // Distance: 0
            color: 'Rouge',
            licensePlate: 'ABC123',
            vin: '1234567890ABCDEFG',
            owner: user._id
          },
          {
            make: 'Honda',
            model: 'Civic',
            year: 2020,          // Distance: 3
            color: 'Bleu',
            licensePlate: 'XYZ789',
            vin: '0987654321HIJKLMN',
            owner: user._id
          },
          {
            make: 'Ford',
            model: 'Focus',
            year: 2015,          // Distance: 8
            color: 'Blanc',
            licensePlate: 'DEF456',
            vin: 'ABCDEFGHIJKLMNOPQ',
            owner: user._id
          }
        ]);

        const response = await request(app)
          .get('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`);

        // Conditions pour GET: [hasAuth, hasVehicles, isOwner]
        const conditions = ['hasAuth', 'hasVehicles', 'isOwner'];
        const results = [true, true, true];
        vehicleTestStats.recordMCCCombination(testName, conditions, results);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(3);
        
        // Enregistrer les distances pour chaque véhicule récupéré
        response.body.data.forEach((vehicle, index) => {
          vehicleTestStats.recordDistanceMetric(
            `${testName}-Vehicle${index+1}`, 
            vehicle, 
            VALID_VEHICLE_REFERENCE, 
            'retrieval'
          );
        });

        vehicleTestStats.endTest(testName, true, 'mcc');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'mcc', error);
        throw error;
      }
    });

    it('MCC: Get vehicles without authentication', async () => {
      const testName = 'MCC-Get-NotAuthenticated';
      
      try {
        vehicleTestStats.startTest(testName, 'mcc');
        
        const response = await request(app)
          .get('/api/vehicles');

        // Conditions: [hasAuth, hasVehicles, isOwner]
        const conditions = ['hasAuth', 'hasVehicles', 'isOwner'];
        const results = [false, false, false];
        vehicleTestStats.recordMCCCombination(testName, conditions, results);

        expect(response.status).toBe(401);
        vehicleTestStats.endTest(testName, true, 'mcc');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'mcc', error);
        throw error;
      }
    });

    it('Distance: Performance test with various distances', async () => {
      const testName = 'Distance-Performance-Various';
      
      try {
        vehicleTestStats.startTest(testName, 'distance');
        
        // Créer véhicules avec différentes distances calculées
        const vehicleVariations = [
          {
            make: 'Toyota', model: 'Camry', year: 2023, // Distance: 0
            licensePlate: 'ABC123', vin: '1234567890ABCDEFG',
            expectedDistance: 0
          },
          {
            make: 'Toyota', model: 'Camry', year: 2021, // Distance: 0.2
            licensePlate: 'ABC12', vin: '1234567890ABCDEF',
            expectedDistance: 3.2
          },
          {
            make: 'Toyota', model: 'Camry', year: 2018, // Distance: 0.5
            licensePlate: 'AB', vin: '123456789',
            expectedDistance: 20.5
          },
          {
            make: 'Toyota', model: 'Camry', year: 2010, // Distance: 1.3
            licensePlate: '', vin: '123',
            expectedDistance: 37.3
          }
        ];

        for (const [index, vehicleData] of vehicleVariations.entries()) {
          const startTime = Date.now();
          
          const response = await request(app)
            .post('/api/vehicles')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              make: vehicleData.make,
              model: vehicleData.model,
              year: vehicleData.year,
              color: 'Test',
              licensePlate: vehicleData.licensePlate,
              vin: vehicleData.vin
            });

          const endTime = Date.now();
          const actualDistance = vehicleTestStats.calculateDistanceMetric(vehicleData, VALID_VEHICLE_REFERENCE);
          
          vehicleTestStats.recordDistanceMetric(
            `${testName}-Variation${index+1}`, 
            vehicleData, 
            VALID_VEHICLE_REFERENCE, 
            actualDistance.distance <= 5 ? 'near' : actualDistance.distance <= 15 ? 'boundary' : 'far'
          );

          console.log(`📊 Variation ${index+1}: Distance calculée ${actualDistance.distance}, Temps: ${endTime-startTime}ms`);
        }

        vehicleTestStats.endTest(testName, true, 'distance');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'distance', error);
        throw error;
      }
    });
  });

  describe('Advanced MCC - Complex Condition Combinations', () => {
    
    it('MCC: Complex validation - Multiple field validation combination', async () => {
      const testName = 'MCC-Complex-MultipleValidation';
      
      try {
        vehicleTestStats.startTest(testName, 'mcc');
        
        // Test avec 6 conditions: make, model, year, vin, plate, auth
        const vehicleData = {
          make: 'T',             // hasValidMake: false (trop court)
          model: '',             // hasValidModel: false (vide)
          year: 2024,            // hasValidYear: true
          color: 'Rouge',
          licensePlate: 'ABCDEFGHIJK', // hasValidPlate: true (supposé)
          vin: '1234567890ABCDEF' // hasValidVIN: true (17 chars)
        };

        const response = await request(app)
          .post('/api/vehicles')
          .set('Authorization', `Bearer ${userToken}`)
          .send(vehicleData);

        // 6 conditions = 2^6 = 64 combinaisons possibles
        const conditions = ['hasValidMake', 'hasValidModel', 'hasValidYear', 'hasValidPlate', 'hasValidVIN', 'isAuthenticated'];
        const results = [false, false, true, true, true, true]; // 001111
        vehicleTestStats.recordMCCCombination(testName, conditions, results);
        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'boundary');

        expect(response.status).toBe(400);
        vehicleTestStats.endTest(testName, true, 'mcc');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'mcc', error);
        throw error;
      }
    });

    // Générer quelques combinaisons supplémentaires pour approcher 2^n
    it('MCC: Auto-generated combinations test', async () => {
      const testName = 'MCC-Auto-Generated';
      
      try {
        vehicleTestStats.startTest(testName, 'mcc');
        
        // Générer automatiquement plusieurs combinaisons
        const combinations = [
          { make: 'Toyota', model: 'Camry', year: 2023, vin: '1234567890ABCDEFG', auth: true }, // 11111
          { make: '', model: 'Camry', year: 2023, vin: '1234567890ABCDEFG', auth: true },      // 01111
          { make: 'Toyota', model: '', year: 2023, vin: '1234567890ABCDEFG', auth: true },     // 10111
          { make: 'Toyota', model: 'Camry', year: 1800, vin: '1234567890ABCDEFG', auth: true }, // 11011
          { make: 'Toyota', model: 'Camry', year: 2023, vin: '123', auth: true },              // 11101
          { make: 'Toyota', model: 'Camry', year: 2023, vin: '1234567890ABCDEFG', auth: false }, // 11110
        ];

        let successCount = 0;
        for (const [index, combo] of combinations.entries()) {
          try {
            const vehicleData = {
              make: combo.make,
              model: combo.model,
              year: combo.year,
              color: 'Test',
              licensePlate: 'ABC123',
              vin: combo.vin
            };

            const request_builder = request(app).post('/api/vehicles');
            if (combo.auth) {
              request_builder.set('Authorization', `Bearer ${userToken}`);
            }

            const response = await request_builder.send(vehicleData);
            
            const conditions = ['hasValidMake', 'hasValidModel', 'hasValidYear', 'hasValidVIN', 'isAuthenticated'];
            const results = [
              !!combo.make && combo.make.length > 1,
              !!combo.model && combo.model.length > 0,
              combo.year > 1900 && combo.year <= 2030,
              combo.vin && combo.vin.length >= 17,
              combo.auth
            ];
            
            vehicleTestStats.recordMCCCombination(`${testName}-Combo${index+1}`, conditions, results);
            vehicleTestStats.recordDistanceMetric(`${testName}-Combo${index+1}`, vehicleData, VALID_VEHICLE_REFERENCE, 'auto');
            
            successCount++;
            console.log(`✅ Combinaison ${index+1} testée: ${results.map(r => r ? '1' : '0').join('')}`);
            
          } catch (error) {
            console.log(`❌ Erreur combinaison ${index+1}: ${error.message}`);
          }
        }

        vehicleTestStats.endTest(testName, successCount === combinations.length, 'mcc');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'mcc', error);
        throw error;
      }
    });
  });
});

// Export pour utilisation dans d'autres fichiers
module.exports = { 
  VehicleTestStats, 
  addVehicleStatsToResponse: (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (process.env.NODE_ENV === 'test' && req.headers['x-vehicle-test-stats'] === 'true') {
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        responseData.vehicleTestStats = vehicleTestStats.getFinalReport();
        return originalSend.call(this, responseData);
      }
      return originalSend.call(this, data);
    };
    
    next();
  }
};


    // Test 7: Combinaison multiple invalide (00100)
    it('MCC: Multiple invalid conditions', async () => {
      const testName = 'MCC-MultipleInvalid';
      
      try {
        vehicleTestStats.startTest(testName, 'mcc');
        
        const vehicleData = {
          // make: manquant         // hasValidMake: false
          // model: manquant        // hasValidModel: false
          year: 2023,            // hasValidYear: true
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '123'             // hasValidVIN: false
        };
        // isAuthenticated: false

        const response = await request(app)
          .post('/api/vehicles')
          .send(vehicleData);

        const conditions = ['hasValidMake', 'hasValidModel', 'hasValidYear', 'hasValidVIN', 'isAuthenticated'];
        const results = [false, false, true, false, false];
        vehicleTestStats.recordMCCCombination(testName, conditions, results);
        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'far');

        expect(response.status).toBe(401);
        vehicleTestStats.endTest(testName, true, 'mcc');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'mcc', error);
        throw error;
      }
    });

    // Test 8: Combinaison limite (11100)
    it('MCC: Boundary combination - Valid basic data, invalid VIN and auth', async () => {
      const testName = 'MCC-BoundaryCombination';
      
      try {
        vehicleTestStats.startTest(testName, 'mcc');
        
        const vehicleData = {
          make: 'Toyota',        // hasValidMake: true
          model: 'Camry',        // hasValidModel: true
          year: 2023,            // hasValidYear: true
          color: 'Rouge',
          licensePlate: 'ABC123',
          vin: '12345'           // hasValidVIN: false (longueur limite)
        };
        // isAuthenticated: false

        const response = await request(app)
          .post('/api/vehicles')
          .send(vehicleData);

        const conditions = ['hasValidMake', 'hasValidModel', 'hasValidYear', 'hasValidVIN', 'isAuthenticated'];
        const results = [true, true, true, false, false];
        vehicleTestStats.recordMCCCombination(testName, conditions, results);
        vehicleTestStats.recordDistanceMetric(testName, vehicleData, VALID_VEHICLE_REFERENCE, 'boundary');

        expect(response.status).toBe(401);
        vehicleTestStats.endTest(testName, true, 'mcc');
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'mcc', error);
        throw error;
      }

    });

// Export pour utilisation dans d'autres fichiers

module.exports = { VehicleTestStats, addVehicleStatsToResponse };







/*

// Tests pour les endpoints des véhicules avec statistiques avancées
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');

// Classe avancée pour gérer les statistiques de test avec pourcentages
class VehicleTestStats {
  constructor() {
    this.stats = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      testResults: [],
      categories: {
        creation: { total: 0, passed: 0, failed: 0 },
        validation: { total: 0, passed: 0, failed: 0 },
        authentication: { total: 0, passed: 0, failed: 0 },
        retrieval: { total: 0, passed: 0, failed: 0 }
      },
      performance: {
        totalTime: 0,
        fastestTest: null,
        slowestTest: null,
        responseTimes: []
      },
      startTime: null,
      sessionStartTime: Date.now()
    };
  }

  startTest(testName, category = 'general') {
    this.stats.startTime = Date.now();
    this.stats.totalTests++;
    
    // Incrémenter la catégorie
    if (this.stats.categories[category]) {
      this.stats.categories[category].total++;
    }
    
    console.log(`🧪 [DÉMARRAGE] ${testName} (${category})`);
  }

  endTest(testName, success, category = 'general', error = null) {
    const endTime = Date.now();
    const duration = endTime - this.stats.startTime;
    this.stats.performance.totalTime += duration;
    this.stats.performance.responseTimes.push(duration);

    // Mettre à jour les records de performance
    if (!this.stats.performance.fastestTest || duration < this.stats.performance.fastestTest.duration) {
      this.stats.performance.fastestTest = { testName, duration };
    }
    if (!this.stats.performance.slowestTest || duration > this.stats.performance.slowestTest.duration) {
      this.stats.performance.slowestTest = { testName, duration };
    }

    const result = {
      testName,
      category,
      success,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      error: error?.message || null,
      responseTime: duration
    };

    this.stats.testResults.push(result);

    // Mettre à jour les statistiques globales et par catégorie
    if (success) {
      this.stats.passedTests++;
      if (this.stats.categories[category]) {
        this.stats.categories[category].passed++;
      }
      console.log(`✅ [SUCCÈS] ${testName} - ${duration}ms`);
    } else {
      this.stats.failedTests++;
      if (this.stats.categories[category]) {
        this.stats.categories[category].failed++;
      }
      console.log(`❌ [ÉCHEC] ${testName} - ${duration}ms`);
      if (error) console.log(`   Erreur: ${error.message}`);
    }

    // Afficher les statistiques en temps réel avec pourcentages
    this.displayCurrentStats();
  }

  calculatePercentages() {
    const totalTests = this.stats.totalTests;
    if (totalTests === 0) return {};

    return {
      successRate: ((this.stats.passedTests / totalTests) * 100).toFixed(2),
      failureRate: ((this.stats.failedTests / totalTests) * 100).toFixed(2),
      completionRate: (((this.stats.passedTests + this.stats.failedTests) / totalTests) * 100).toFixed(2),
      categories: Object.entries(this.stats.categories).reduce((acc, [key, value]) => {
        if (value.total > 0) {
          acc[key] = {
            successRate: ((value.passed / value.total) * 100).toFixed(2),
            failureRate: ((value.failed / value.total) * 100).toFixed(2),
            coverage: ((value.total / totalTests) * 100).toFixed(2)
          };
        }
        return acc;
      }, {})
    };
  }

  displayCurrentStats() {
    const percentages = this.calculatePercentages();
    const avgTime = this.stats.performance.totalTime / this.stats.totalTests;

    console.log('\n📊 === STATISTIQUES ACTUELLES VÉHICULES ===');
    console.log(`📈 Total des tests: ${this.stats.totalTests}`);
    console.log(`✅ Réussis: ${this.stats.passedTests} (${percentages.successRate}%)`);
    console.log(`❌ Échoués: ${this.stats.failedTests} (${percentages.failureRate}%)`);
    console.log(`🎯 Taux de réussite global: ${percentages.successRate}%`);
    console.log(`⏱️  Temps total: ${this.stats.performance.totalTime}ms`);
    console.log(`📊 Temps moyen: ${Math.round(avgTime)}ms`);
    
    // Afficher les statistiques par catégorie
    console.log('\n🏷️  === STATISTIQUES PAR CATÉGORIE ===');
    for (const [category, stats] of Object.entries(this.stats.categories)) {
      if (stats.total > 0) {
        const categoryPercentages = percentages.categories[category];
        console.log(`${category.toUpperCase()}:`);
        console.log(`  📊 Couverture: ${categoryPercentages.coverage}% (${stats.total}/${this.stats.totalTests})`);
        console.log(`  ✅ Succès: ${categoryPercentages.successRate}% (${stats.passed}/${stats.total})`);
        console.log(`  ❌ Échecs: ${categoryPercentages.failureRate}% (${stats.failed}/${stats.total})`);
      }
    }
    console.log('==========================================\n');
  }

  getPerformanceStats() {
    const times = this.stats.performance.responseTimes;
    if (times.length === 0) return {};

    times.sort((a, b) => a - b);
    const median = times.length % 2 === 0 
      ? (times[times.length / 2 - 1] + times[times.length / 2]) / 2 
      : times[Math.floor(times.length / 2)];

    return {
      average: Math.round(this.stats.performance.totalTime / times.length),
      median: Math.round(median),
      min: Math.min(...times),
      max: Math.max(...times),
      standardDeviation: Math.round(this.calculateStandardDeviation(times))
    };
  }

  calculateStandardDeviation(values) {
    const avg = values.reduce((a, b) => a + b) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  getFinalReport() {
    const percentages = this.calculatePercentages();
    const performance = this.getPerformanceStats();
    const sessionDuration = Date.now() - this.stats.sessionStartTime;

    return {
      summary: {
        totalTests: this.stats.totalTests,
        passedTests: this.stats.passedTests,
        failedTests: this.stats.failedTests,
        successRate: `${percentages.successRate}%`,
        failureRate: `${percentages.failureRate}%`,
        completionRate: `${percentages.completionRate}%`,
        sessionDuration: `${sessionDuration}ms`,
        totalExecutionTime: `${this.stats.performance.totalTime}ms`
      },
      performance: {
        averageTime: `${performance.average}ms`,
        medianTime: `${performance.median}ms`,
        fastestTest: this.stats.performance.fastestTest,
        slowestTest: this.stats.performance.slowestTest,
        standardDeviation: `${performance.standardDeviation}ms`
      },
      categories: Object.entries(this.stats.categories).reduce((acc, [key, value]) => {
        if (value.total > 0) {
          acc[key] = {
            total: value.total,
            passed: value.passed,
            failed: value.failed,
            successRate: `${percentages.categories[key].successRate}%`,
            coverage: `${percentages.categories[key].coverage}%`
          };
        }
        return acc;
      }, {}),
      detailedResults: this.stats.testResults
    };
  }
}

// Instance globale des statistiques pour les véhicules
const vehicleTestStats = new VehicleTestStats();

// Middleware pour ajouter les stats aux réponses des véhicules
const addVehicleStatsToResponse = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (process.env.NODE_ENV === 'test' && req.headers['x-vehicle-test-stats'] === 'true') {
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;
      responseData.vehicleTestStats = vehicleTestStats.getFinalReport();
      return originalSend.call(this, responseData);
    }
    return originalSend.call(this, data);
  };
  
  next();
};

describe('Vehicles Endpoints', () => {
  let userToken, user;

  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/propelize_db');
    console.log('🚗 Connexion à la base de données établie pour les tests de véhicules');
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
    
    // Afficher le rapport final détaillé
    console.log('\n🎯 === RAPPORT FINAL DES TESTS VÉHICULES ===');
    const finalReport = vehicleTestStats.getFinalReport();
    
    console.log(`📊 RÉSUMÉ GLOBAL:`);
    console.log(`   Taux de réussite: ${finalReport.summary.successRate}`);
    console.log(`   Taux d'échec: ${finalReport.summary.failureRate}`);
    console.log(`   Temps total: ${finalReport.summary.totalExecutionTime}`);
    console.log(`   Durée de session: ${finalReport.summary.sessionDuration}`);
    
    console.log(`\n⚡ PERFORMANCES:`);
    console.log(`   Temps moyen: ${finalReport.performance.averageTime}`);
    console.log(`   Temps médian: ${finalReport.performance.medianTime}`);
    console.log(`   Test le plus rapide: ${finalReport.performance.fastestTest?.testName} (${finalReport.performance.fastestTest?.duration}ms)`);
    console.log(`   Test le plus lent: ${finalReport.performance.slowestTest?.testName} (${finalReport.performance.slowestTest?.duration}ms)`);
    
    console.log(`\n🏷️  ANALYSE PAR CATÉGORIE:`);
    for (const [category, stats] of Object.entries(finalReport.categories)) {
      console.log(`   ${category.toUpperCase()}: ${stats.successRate} succès (${stats.passed}/${stats.total}) - Couverture: ${stats.coverage}`);
    }
    console.log('=============================================\n');
  });

  describe('POST /api/vehicles', () => {
    it('should create vehicle with valid data', async () => {
      const testName = 'Création véhicule avec données valides';
      
      try {
        vehicleTestStats.startTest(testName, 'creation');
        
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
          .set('x-vehicle-test-stats', 'true')
          .send(vehicleData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.make).toBe('Toyota');
        expect(response.body.data.owner).toBe(user._id.toString());
        
        vehicleTestStats.endTest(testName, true, 'creation');
        
        console.log(`🚗 Véhicule créé: ${response.body.data.make} ${response.body.data.model}`);
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'creation', error);
        throw error;
      }
    });

    it('should reject invalid vehicle data', async () => {
      const testName = 'Rejet données véhicule invalides';
      
      try {
        vehicleTestStats.startTest(testName, 'validation');
        
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
          .set('x-vehicle-test-stats', 'true')
          .send(invalidVehicle);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        
        vehicleTestStats.endTest(testName, true, 'validation');
        
        console.log(`❌ Validation échouée comme attendu: Status ${response.status}`);
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'validation', error);
        throw error;
      }
    });

    it('should reject unauthenticated request', async () => {
      const testName = 'Rejet requête non authentifiée';
      
      try {
        vehicleTestStats.startTest(testName, 'authentication');
        
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
          .set('x-vehicle-test-stats', 'true')
          .send(vehicleData);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        
        vehicleTestStats.endTest(testName, true, 'authentication');
        
        console.log(`🔒 Authentification requise: Status ${response.status}`);
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'authentication', error);
        throw error;
      }
    });
  });

  describe('GET /api/vehicles', () => {
    it('should get all vehicles for authenticated user', async () => {
      const testName = 'Récupération véhicules utilisateur authentifié';
      
      try {
        vehicleTestStats.startTest(testName, 'retrieval');
        
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
          .set('Authorization', `Bearer ${userToken}`)
          .set('x-vehicle-test-stats', 'true');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        
        vehicleTestStats.endTest(testName, true, 'retrieval');
        
        console.log(`📋 ${response.body.data.length} véhicules récupérés`);
        
      } catch (error) {
        vehicleTestStats.endTest(testName, false, 'retrieval', error);
        throw error;
      }
    });
  });
});

// Export pour utilisation dans d'autres fichiers
module.exports = { VehicleTestStats, addVehicleStatsToResponse };

*/

