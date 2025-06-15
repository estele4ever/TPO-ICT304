// src/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/propelize_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Charger les données initiales (seeders)
    await seedDatabase();
  } catch (error) {
    console.error('Erreur de connexion à la base de données:', error);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  const User = require('../models/User');
  const Vehicle = require('../models/Vehicle');
  const bcrypt = require('bcryptjs');

  try {
    // Vérifier si des données existent déjà
    const userCount = await User.countDocuments();
    const vehicleCount = await Vehicle.countDocuments();

    if (userCount === 0) {
      // Créer des utilisateurs par défaut
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      const defaultUsers = [
        {
          username: 'admin',
          email: 'admin@propelize.com',
          password: hashedPassword,
          role: 'admin'
        },
        {
          username: 'user1',
          email: 'user1@propelize.com', 
          password: hashedPassword,
          role: 'user'
        }
      ];

      await User.insertMany(defaultUsers);
      console.log('Utilisateurs par défaut créés');
    }

    if (vehicleCount === 0) {
      // Créer des véhicules par défaut
      const defaultVehicles = [
        {
          make: 'Toyota',
          model: 'Camry',
          year: 2023,
          color: 'Blanc',
          licensePlate: 'ABC123',
          vin: '1234567890ABCDEFG'
        },
        {
          make: 'Honda',
          model: 'Civic',
          year: 2022,
          color: 'Noir',
          licensePlate: 'XYZ789',
          vin: '0987654321HIJKLMN'
        }
      ];

      await Vehicle.insertMany(defaultVehicles);
      console.log('Véhicules par défaut créés');
    }
  } catch (error) {
    console.error('Erreur lors du chargement des données initiales:', error);
  }
};

module.exports = connectDB;
