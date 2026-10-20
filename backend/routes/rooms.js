const express = require('express');
const router = express.Router();
const { getRooms, getRoomById, checkAvailability, getCities, getRoomTypes } = require('../controllers/roomController');

router.get('/', getRooms);
router.get('/cities', getCities);
router.get('/types', getRoomTypes);
router.get('/:id', getRoomById);
router.get('/:id/availability', checkAvailability);

module.exports = router;
