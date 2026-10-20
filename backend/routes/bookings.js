const express = require('express');
const router = express.Router();
const { createBooking, getBookingById, cancelBooking, getBookings, deleteBooking } = require('../controllers/bookingController');

router.post('/', createBooking);
router.get('/', getBookings);
router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);
router.delete('/:id', deleteBooking);

module.exports = router;
