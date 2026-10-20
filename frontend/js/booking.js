import { API } from './api.js';

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
}

function getRoomId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('roomId');
}

function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError() {
  const el = document.getElementById('errorMsg');
  if (el) el.style.display = 'none';
}

function showSuccess(msg) {
  const el = document.getElementById('successMsg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

async function loadRoomSummary() {
  const roomId = getRoomId();
  if (!roomId) {
    document.getElementById('roomSummary').innerHTML = '<p>Room not found.</p>';
    return;
  }

  try {
    const room = await API.getRoom(roomId);
    const summary = document.getElementById('roomSummary');
    summary.innerHTML = `
      <h3>Booking Summary</h3>
      <div class="booking-details" style="margin:1rem 0">
        <p><strong>Hotel:</strong> ${room.name}</p>
        <p><strong>Room Type:</strong> ${room.room_type}</p>
        <p><strong>Location:</strong> ${room.city}${room.state ? ', ' + room.state : ''}</p>
        <p><strong>Price per night:</strong> ${formatPrice(room.price)}</p>
        <p id="nightsRow" style="display:none"><strong>Nights:</strong> <span id="nights">0</span></p>
        <p id="totalRow" style="display:none"><strong>Total:</strong> <span id="totalPrice" style="font-weight:700;color:var(--primary)"></span></p>
      </div>
    `;
    document.getElementById('roomIdInput').value = roomId;
    document.getElementById('pricePerNight').value = room.price;

    const checkIn = getParam('checkIn');
    const checkOut = getParam('checkOut');
    if (checkIn) document.getElementById('checkIn').value = checkIn;
    if (checkOut) document.getElementById('checkOut').value = checkOut;
    updateTotal();
  } catch (err) {
    document.getElementById('roomSummary').innerHTML = `<p>${err.message}</p>`;
  }
}

function updateTotal() {
  const checkIn = document.getElementById('checkIn').value;
  const checkOut = document.getElementById('checkOut').value;
  const price = parseInt(document.getElementById('pricePerNight').value) || 0;

  if (checkIn && checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (nights > 0) {
      const total = price * nights;
      document.getElementById('nights').textContent = nights;
      document.getElementById('nightsRow').style.display = 'block';
      document.getElementById('totalPrice').textContent = formatPrice(total);
      document.getElementById('totalRow').style.display = 'block';
      return nights;
    }
  }
  document.getElementById('nightsRow').style.display = 'none';
  document.getElementById('totalRow').style.display = 'none';
  return 0;
}

async function handleSubmit(e) {
  e.preventDefault();
  hideError();
  document.getElementById('submitBtn').disabled = true;
  document.getElementById('submitBtn').textContent = 'Booking...';

  const formData = new FormData(document.getElementById('bookingForm'));
  const data = Object.fromEntries(formData.entries());

  data.room_id = parseInt(data.room_id);
  data.adults = parseInt(data.adults) || 1;
  data.children = parseInt(data.children) || 0;

  try {
    const result = await API.createBooking(data);
    if (result.booking && result.booking.id) {
      window.location.href = `confirmation.html?bookingId=${result.booking.id}`;
    } else {
      showSuccess('Booking confirmed!');
    }
  } catch (err) {
    showError(err.message);
  } finally {
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('submitBtn').textContent = 'Confirm Booking';
  }
}

function initBooking() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('checkIn').min = today;
  document.getElementById('checkOut').min = today;

  document.getElementById('checkIn').addEventListener('change', () => {
    const checkIn = document.getElementById('checkIn').value;
    if (checkIn) document.getElementById('checkOut').min = checkIn;
    updateTotal();
  });
  document.getElementById('checkOut').addEventListener('change', updateTotal);

  loadRoomSummary();
  document.getElementById('bookingForm').addEventListener('submit', handleSubmit);
}

initBooking();
