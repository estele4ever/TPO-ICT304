const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('dotenv').config();
const vehicleRoutes = require('./routes/vehicleRoutes');
const setupSwagger = require('./swagger');
setupSwagger(app);

dotenv.config();
const app = express();
app.use(express.json());

mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use('/api/vehicles', vehicleRoutes);

module.exports = app;