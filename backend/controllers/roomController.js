const db = require('../config/db');

function getRooms(req, res) {
  const { city, room_type, sort, search, page = 1, limit = 24, availability } = req.query;

  let conditions = [];
  let params = [];

  if (city) {
    conditions.push('LOWER(h.city) = LOWER(?)');
    params.push(city);
  }
  if (room_type) {
    conditions.push('LOWER(r.room_type) LIKE LOWER(?)');
    params.push('%' + room_type + '%');
  }
  if (search) {
    conditions.push('(LOWER(h.name) LIKE LOWER(?) OR LOWER(h.city) LIKE LOWER(?) OR LOWER(r.room_type) LIKE LOWER(?))');
    const s = '%' + search + '%';
    params.push(s, s, s);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  let orderBy = 'ORDER BY h.rating DESC, h.reviews_count DESC';
  if (sort === 'price_asc') orderBy = 'ORDER BY r.price ASC';
  else if (sort === 'price_desc') orderBy = 'ORDER BY r.price DESC';
  else if (sort === 'rating_asc') orderBy = 'ORDER BY h.rating ASC';
  else if (sort === 'rating_desc') orderBy = 'ORDER BY h.rating DESC';
  else if (sort === 'name_asc') orderBy = 'ORDER BY h.name ASC';
  else if (sort === 'reviews_desc') orderBy = 'ORDER BY h.reviews_count DESC';

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const baseSelect = `
    SELECT r.id as room_id, r.room_type, r.price, r.total_rooms,
           h.id as hotel_id, h.name, h.place, h.city, h.state, h.rating, h.reviews_count,
           COALESCE(bk.confirmed_count, 0) as confirmed_bookings,
           CASE WHEN COALESCE(bk.confirmed_count, 0) >= r.total_rooms THEN 0 ELSE r.total_rooms - COALESCE(bk.confirmed_count, 0) END as available_count
    FROM rooms r
    JOIN hotels h ON r.hotel_id = h.id
    LEFT JOIN (
      SELECT room_id, COUNT(*) as confirmed_count FROM bookings WHERE status = 'confirmed' GROUP BY room_id
    ) bk ON bk.room_id = r.id
  `;

  let availabilityWhere = where;
  if (availability === 'available') {
    availabilityWhere = (where ? where + ' AND ' : 'WHERE ') +
      '(COALESCE(bk.confirmed_count, 0) < r.total_rooms)';
  } else if (availability === 'booked') {
    availabilityWhere = (where ? where + ' AND ' : 'WHERE ') +
      '(COALESCE(bk.confirmed_count, 0) >= r.total_rooms)';
  }

  const countSql = `SELECT COUNT(*) as total FROM rooms r JOIN hotels h ON r.hotel_id = h.id LEFT JOIN (SELECT room_id, COUNT(*) as confirmed_count FROM bookings WHERE status = 'confirmed' GROUP BY room_id) bk ON bk.room_id = r.id ${availabilityWhere}`;
  const countRow = db.prepare(countSql).get(...params);

  const dataSql = `${baseSelect} ${availabilityWhere} ${orderBy} LIMIT ? OFFSET ?`;
  const rooms = db.prepare(dataSql).all(...params, parseInt(limit), offset);

  res.json({
    total: countRow.total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(countRow.total / parseInt(limit)),
    rooms
  });
}

function getRoomById(req, res) {
  const { id } = req.params;
  const row = db.prepare(`
    SELECT r.id as room_id, r.room_type, r.price, r.total_rooms,
           h.id as hotel_id, h.name, h.place, h.city, h.state, h.rating, h.reviews_count,
           COALESCE(bk.confirmed_count, 0) as confirmed_bookings,
           CASE WHEN COALESCE(bk.confirmed_count, 0) >= r.total_rooms THEN 0 ELSE r.total_rooms - COALESCE(bk.confirmed_count, 0) END as available_count
    FROM rooms r
    JOIN hotels h ON r.hotel_id = h.id
    LEFT JOIN (
      SELECT room_id, COUNT(*) as confirmed_count FROM bookings WHERE status = 'confirmed' GROUP BY room_id
    ) bk ON bk.room_id = r.id
    WHERE r.id = ?
  `).get(id);
  if (!row) return res.status(404).json({ error: 'Room not found.' });
  res.json(row);
}

function checkAvailability(req, res) {
  const { id } = req.params;
  const { checkIn, checkOut } = req.query;
  if (!checkIn || !checkOut) return res.status(400).json({ error: 'checkIn and checkOut are required.' });

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
  if (!room) return res.status(404).json({ error: 'Room not found.' });

  const row = db.prepare(`
    SELECT COUNT(*) as booked FROM bookings
    WHERE room_id = ? AND status = 'confirmed'
    AND check_in < ? AND check_out > ?
  `).get(id, checkOut, checkIn);

  const booked = row.booked || 0;
  const available = room.total_rooms - booked;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

  res.json({
    available: available > 0,
    total_rooms: room.total_rooms,
    booked,
    available_count: available > 0 ? available : 0,
    nights,
    price_per_night: room.price,
    total_price: room.price * nights
  });
}

function getCities(req, res) {
  const rows = db.prepare("SELECT DISTINCT city FROM hotels WHERE city IS NOT NULL AND city != '' ORDER BY city ASC").all();
  res.json(rows.map(r => r.city).filter(Boolean));
}

function getRoomTypes(req, res) {
  const rows = db.prepare("SELECT DISTINCT room_type FROM rooms WHERE room_type IS NOT NULL AND room_type != '' ORDER BY room_type ASC").all();
  res.json(rows.map(r => r.room_type).filter(Boolean));
}

module.exports = { getRooms, getRoomById, checkAvailability, getCities, getRoomTypes };
