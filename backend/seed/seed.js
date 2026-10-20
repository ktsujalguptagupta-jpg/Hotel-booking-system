const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const dataFilePath = path.join(__dirname, '..', '..', 'data', 'HotelFinalDataset.txt');

function cleanPrice(priceStr) {
  if (!priceStr) return 0;
  const cleaned = String(priceStr).replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
}

function cleanRating(ratingStr) {
  if (!ratingStr || String(ratingStr).trim() === '') return 0;
  return parseFloat(ratingStr) || 0;
}

function cleanReviews(reviewsStr) {
  if (!reviewsStr || String(reviewsStr).trim() === '') return 0;
  return parseInt(reviewsStr, 10) || 0;
}

function parseDataset() {
  const raw = fs.readFileSync(dataFilePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '');
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split('\t');
    if (cols.length < 8) continue;

    const name = cols[1] ? cols[1].trim().replace(/^"|"$/g, '') : '';
    const place = cols[2] ? cols[2].trim().replace(/^"|"$/g, '') : '';
    const roomType = cols[3] ? cols[3].trim().replace(/^"|"$/g, '') : '';
    const price = cleanPrice(cols[4]);
    const reviewsCount = cleanReviews(cols[5]);
    const rating = cleanRating(cols[6]);
    const city = cols[7] ? cols[7].trim().replace(/^"|"$/g, '') : '';
    const state = cols[8] ? cols[8].trim().replace(/^"|"$/g, '') : '';

    if (!name || !roomType) continue;
    rows.push({ name, place, roomType, price, reviewsCount, rating, city, state });
  }
  return rows;
}

function seed() {
  const rows = parseDataset();
  console.log(`Parsed ${rows.length} entries`);

  db.prepare('DELETE FROM bookings').run();
  db.prepare('DELETE FROM rooms').run();
  db.prepare('DELETE FROM hotels').run();
  db.prepare(`DELETE FROM sqlite_sequence WHERE name IN ('hotels','rooms','bookings')`).run();

  const hotelMap = new Map();
  const insertHotel = db.prepare(
    'INSERT INTO hotels (name, place, city, state, rating, reviews_count) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertRoom = db.prepare(
    'INSERT INTO rooms (hotel_id, room_type, price, total_rooms) VALUES (?, ?, ?, 1)'
  );

  const transaction = db.transaction((entries) => {
    for (const row of entries) {
      const key = row.name + '||' + row.city;
      let hotelId;
      if (hotelMap.has(key)) {
        hotelId = hotelMap.get(key);
      } else {
        const res = insertHotel.run(row.name, row.place, row.city, row.state, row.rating, row.reviewsCount);
        hotelId = res.lastInsertRowid;
        hotelMap.set(key, hotelId);
      }
      insertRoom.run(hotelId, row.roomType, row.price);
    }
  });

  transaction(rows);
  console.log(`Seeding complete. ${rows.length} rooms inserted.`);
  db.close();
}

seed();
