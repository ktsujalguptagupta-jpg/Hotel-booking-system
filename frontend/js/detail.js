import { API } from './api.js';

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
}

function getId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function showResult(el, type, msg) {
  if (!el) return;
  el.className = 'availability-result ' + type;
  el.textContent = msg;
  el.style.display = 'block';
}

async function loadRoom() {
  const id = getId();
  if (!id) {
    document.getElementById('roomDetail').innerHTML = '<div class="empty-state">Room not found</div>';
    return;
  }

  try {
    const room = await API.getRoom(id);
    const isBooked = room.confirmed_bookings >= room.total_rooms;
    const statusBadge = isBooked
      ? '<span class="badge badge-danger">Fully Booked</span>'
      : '<span class="badge badge-success">Available</span>';

    const container = document.getElementById('roomDetail');
    container.innerHTML = `
      <div class="room-details">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem">
          <h2>${room.name}</h2>
          ${statusBadge}
        </div>
        <span class="room-type">${room.room_type}</span>
        <p class="meta">${room.place || ''}${room.city ? ' • ' + room.city : ''}${room.state ? ', ' + room.state : ''}</p>
        ${room.rating ? `<div class="rating">★ ${room.rating.toFixed(1)} <span style="color:var(--text-light)">(${room.reviews_count} reviews)</span></div>` : ''}
        <div class="price">${formatPrice(room.price)} <span>/ night</span></div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Total Rooms</div>
            <div class="info-value">${room.total_rooms}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Available</div>
            <div class="info-value">${room.available_count}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Confirmed Bookings</div>
            <div class="info-value">${room.confirmed_bookings}</div>
          </div>
          <div class="info-item">
            <div class="info-label">City</div>
            <div class="info-value">${room.city || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">State</div>
            <div class="info-value">${room.state || 'N/A'}</div>
          </div>
        </div>
      </div>
    `;

    const bookBtn = document.getElementById('bookBtn');
    if (isBooked) {
      bookBtn.textContent = 'Fully Booked';
      bookBtn.classList.add('btn-secondary');
      bookBtn.style.cursor = 'not-allowed';
      bookBtn.style.opacity = '0.5';
      bookBtn.removeAttribute('href');
      bookBtn.onclick = (e) => e.preventDefault();
    } else {
      bookBtn.href = `booking.html?roomId=${room.room_id}`;
      bookBtn.textContent = 'Book This Room';
    }
  } catch (err) {
    document.getElementById('roomDetail').innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

async function checkAvailability() {
  const id = getId();
  const checkIn = document.getElementById('checkIn').value;
  const checkOut = document.getElementById('checkOut').value;
  const result = document.getElementById('availabilityResult');

  if (!checkIn || !checkOut) {
    showResult(result, 'error', 'Please select both check-in and check-out dates.');
    return;
  }

  try {
    const data = await API.checkAvailability(id, checkIn, checkOut);
    if (data.available && data.available_count > 0) {
      showResult(
        result,
        'success',
        `Available! ${data.available_count} of ${data.total_rooms} room(s) available for ${data.nights} night(s). Total: ${formatPrice(data.total_price)}`
      );
    } else {
      showResult(result, 'info', 'Not available for selected dates.');
    }
  } catch (err) {
    showResult(result, 'error', err.message);
  }
}

function initDetail() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('checkIn')?.setAttribute('min', today);
  document.getElementById('checkOut')?.setAttribute('min', today);

  document.getElementById('checkIn')?.addEventListener('change', () => {
    const checkIn = document.getElementById('checkIn').value;
    if (checkIn) document.getElementById('checkOut').min = checkIn;
  });

  loadRoom();
  document.getElementById('checkAvailBtn')?.addEventListener('click', checkAvailability);
}

initDetail();
