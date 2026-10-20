import { API } from './api.js';

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
}

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const obj = {};
  for (let [k, v] of params) {
    if (v) obj[k] = v;
  }
  return obj;
}

function setLoading(isLoading) {
  const container = document.getElementById('roomsContainer');
  if (!container) return;
  if (isLoading) {
    container.innerHTML = '<div class="loading">Loading rooms...</div>';
  }
}

async function loadFilters() {
  try {
    const [cities, types] = await Promise.all([API.getCities(), API.getRoomTypes()]);
    const citySelect = document.getElementById('cityFilter');
    const typeSelect = document.getElementById('typeFilter');

    if (citySelect) {
      cities.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        citySelect.appendChild(opt);
      });
    }
    if (typeSelect) {
      types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        typeSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

function renderRooms(rooms) {
  const container = document.getElementById('roomsContainer');
  const countEl = document.getElementById('roomsCount');
  if (!container) return;

  if (countEl) countEl.textContent = rooms.length;

  if (rooms.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No rooms found</h3><p>Try adjusting your filters or search criteria.</p></div>';
    return;
  }

  container.innerHTML = rooms.map(r => {
    const isBooked = r.confirmed_bookings >= r.total_rooms;
    const statusBadge = isBooked
      ? '<span class="badge badge-danger">Fully Booked</span>'
      : '<span class="badge badge-success">Available</span>';

    return `
    <div class="room-card">
      <div class="room-card-content">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <h3>${r.name}</h3>
          ${statusBadge}
        </div>
        <span class="room-type">${r.room_type}</span>
        <p class="meta">${r.place || ''}${r.city ? ' • ' + r.city : ''}${r.state ? ', ' + r.state : ''}</p>
        ${r.rating ? `<div class="rating">★ ${r.rating.toFixed(1)} <span style="color:var(--text-light)">(${r.reviews_count} reviews)</span></div>` : ''}
        <div class="price">${formatPrice(r.price)} <span>/ night</span></div>
        <p class="meta" style="margin-bottom:0.75rem">
          ${r.available_count} of ${r.total_rooms} available${r.confirmed_bookings > 0 ? ` • ${r.confirmed_bookings} confirmed` : ''}
        </p>
        <div class="card-actions">
          <a href="room-detail.html?id=${r.room_id}" class="btn">View Details</a>
          ${isBooked
            ? '<span class="btn btn-secondary" style="cursor:not-allowed;opacity:0.5">Booked</span>'
            : `<a href="booking.html?roomId=${r.room_id}" class="btn btn-secondary">Book Now</a>`}
        </div>
      </div>
    </div>
    `;
  }).join('');
}

async function loadRooms() {
  setLoading(true);
  const params = getQueryParams();
  const filters = {
    city: document.getElementById('cityFilter')?.value || params.city || '',
    room_type: document.getElementById('typeFilter')?.value || params.room_type || '',
    sort: document.getElementById('sortBy')?.value || params.sort || 'rating_desc',
    search: document.getElementById('searchInput')?.value || params.search || '',
    availability: document.getElementById('availFilter')?.value || params.availability || '',
    limit: 1000
  };

  Object.keys(filters).forEach(k => !filters[k] && delete filters[k]);

  try {
    const data = await API.getRooms(filters);
    renderRooms(data.rooms);
  } catch (err) {
    document.getElementById('roomsContainer').innerHTML = `<div class="empty-state"><h3>Error loading rooms</h3><p>${err.message}</p></div>`;
  }
}

function initRoomsPage() {
  const params = getQueryParams();
  if (document.getElementById('cityFilter') && params.city) document.getElementById('cityFilter').value = params.city;
  if (document.getElementById('searchInput') && params.search) document.getElementById('searchInput').value = params.search;
  if (document.getElementById('availFilter') && params.availability) document.getElementById('availFilter').value = params.availability;
  if (document.getElementById('sortBy') && params.sort) document.getElementById('sortBy').value = params.sort;

  loadFilters().then(loadRooms);
  document.getElementById('filterForm')?.addEventListener('submit', (e) => { e.preventDefault(); loadRooms(); });
  document.getElementById('resetFilters')?.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('filterForm').reset(); loadRooms(); });

  // Auto-apply sort when dropdown changes
  document.getElementById('sortBy')?.addEventListener('change', () => loadRooms());
}

initRoomsPage();
