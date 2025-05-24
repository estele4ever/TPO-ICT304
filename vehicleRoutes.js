const express = require('express');
const Vehicle = require('../models/Vehicle');
const router = express.Router();

// GET all vehicles
router.get('/', async (req, res) => {
    const vehicles = await Vehicle.find();
    res.json(vehicles);
});

// POST a new vehicle
router.post('/', async (req, res) => {
    const newVehicle = new Vehicle(req.body);
    await newVehicle.save();
    res.status(201).json(newVehicle);
});

// Other CRUD operations can be added similarly...

module.exports = router;