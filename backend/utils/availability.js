function nightsBetween(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const ms = end.getTime() - start.getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

function isValidDateRange(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(start) || isNaN(end)) return { valid: false, message: 'Invalid date format.' };
  if (start < today) return { valid: false, message: 'Check-in date cannot be in the past.' };
  if (end <= start) return { valid: false, message: 'Check-out must be after check-in.' };
  return { valid: true };
}

module.exports = { nightsBetween, isValidDateRange };
