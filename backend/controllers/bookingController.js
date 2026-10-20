const db = require('../config/db');
const { nightsBetween, isValidDateRange } = require('../utils/availability');

function createBooking(req, res) {
  const { room_id, guest_name, guest_email, guest_phone, check_in, check_out, adults, children } = req.body;

  if (!room_id || !guest_name || !guest_email || !check_in || !check_out) {
    return res.status(400).json({ error: 'room_id, guest_name, guest_email, check_in and check_out are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(guest_email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const dateCheck = isValidDateRange(check_in, check_out);
  if (!dateCheck.valid) {
    return res.status(400).json({ error: dateCheck.message });
  }

  const nights = nightsBetween(check_in, check_out);

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
  if (!room) return res.status(404).json({ error: 'Room not found.' });

  const bookedRow = db.prepare(`
    SELECT COUNT(*) as booked FROM bookings
    WHERE room_id = ? AND status = 'confirmed'
    AND check_in < ? AND check_out > ?
  `).get(room_id, check_out, check_in);

  const booked = bookedRow.booked || 0;
  const available = room.total_rooms - booked;

  if (available <= 0) {
    return res.status(409).json({ error: 'Room is not available for the selected dates.' });
  }

  const total_price = room.price * nights;
  const insert = db.prepare(`
    INSERT INTO bookings (room_id, guest_name, guest_email, guest_phone, check_in, check_out, adults, children, total_price, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
  `);
  const info = insert.run(room_id, guest_name, guest_email, guest_phone || '', check_in, check_out, adults || 1, children || 0, total_price);

  const booking = db.prepare(`
    SELECT b.*, r.room_type, r.price as price_per_night, h.name as hotel_name, h.city, h.state, h.place, h.rating
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN hotels h ON r.hotel_id = h.id
    WHERE b.id = ?
  `).get(info.lastInsertRowid);

  res.status(201).json({ message: 'Booking confirmed!', booking });
}

function getBookingById(req, res) {
  const { id } = req.params;
  const booking = db.prepare(`
    SELECT b.*, r.room_type, r.price as price_per_night, h.name as hotel_name, h.city, h.state, h.place, h.rating
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN hotels h ON r.hotel_id = h.id
    WHERE b.id = ?
  `).get(id);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  res.json(booking);
}

function getBookings(req, res) {
  const { email, phone, page = 1, limit = 20 } = req.query;

  let conditions = [];
  let params = [];

  if (email) {
    conditions.push('LOWER(b.guest_email) = LOWER(?)');
    params.push(email);
  }
  if (phone) {
    conditions.push('b.guest_phone = ?');
    params.push(phone);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countSql = `SELECT COUNT(*) as total FROM bookings b ${where}`;
  const countRow = db.prepare(countSql).get(...params);

  const dataSql = `
    SELECT b.*, r.room_type, r.price as price_per_night, h.name as hotel_name, h.city, h.state, h.place, h.rating
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN hotels h ON r.hotel_id = h.id
    ${where}
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const bookings = db.prepare(dataSql).all(...params, parseInt(limit), offset);

  res.json({
    total: countRow.total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(countRow.total / parseInt(limit)),
    bookings
  });
}

function cancelBooking(req, res) {
  const { id } = req.params;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });

  if (booking.status !== 'confirmed') {
    return res.status(400).json({ error: 'Booking is already cancelled.' });
  }

  const info = db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(500).json({ error: 'Failed to cancel booking.' });

  res.json({ message: 'Booking cancelled successfully.' });
}

function deleteBooking(req, res) {
  const { id } = req.params;
  const info = db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ message: 'Booking deleted successfully.' });
}

module.exports = { createBooking, getBookingById, cancelBooking, getBookings, deleteBooking };
