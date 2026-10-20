const API_BASE = 'http://localhost:5000/api';

async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(API_BASE + endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export const API = {
  getRooms: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/rooms${query ? '?' + query : ''}`);
  },
  getRoom: (id) => apiRequest(`/rooms/${id}`),
  checkAvailability: (id, checkIn, checkOut) => {
    const query = new URLSearchParams({ checkIn, checkOut }).toString();
    return apiRequest(`/rooms/${id}/availability?${query}`);
  },
  createBooking: (bookingData) => apiRequest('/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData)
  }),
  getBooking: (id) => apiRequest(`/bookings/${id}`),
  getBookings: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/bookings${query ? '?' + query : ''}`);
  },
  cancelBooking: (id) => apiRequest(`/bookings/${id}/cancel`, {
    method: 'PATCH'
  }),
  getCities: () => apiRequest('/rooms/cities'),
  getRoomTypes: () => apiRequest('/rooms/types'),
  health: () => apiRequest('/health')
};
