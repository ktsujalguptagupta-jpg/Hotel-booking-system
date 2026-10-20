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

async function initHome() {
  const params = getQueryParams();
  if (params.city && params.city.trim() !== '') {
    const q = new URLSearchParams({ city: params.city.trim() }).toString();
    window.location.href = `rooms.html?${q}`;
    return;
  }
  if (params.room_type && params.room_type.trim() !== '') {
    const q = new URLSearchParams({ room_type: params.room_type.trim() }).toString();
    window.location.href = `rooms.html?${q}`;
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const checkIn = document.getElementById('checkIn');
  const checkOut = document.getElementById('checkOut');
  if (checkIn) {
    checkIn.min = today;
    checkIn.value = today;
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (checkOut) {
    checkOut.min = today;
    checkOut.value = tomorrow.toISOString().split('T')[0];
  }
  checkIn?.addEventListener('change', () => {
    if (checkIn.value) checkOut.min = checkIn.value;
  });
}

initHome();
