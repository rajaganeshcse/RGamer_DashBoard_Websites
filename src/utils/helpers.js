/**
 * Calculate percentage safely
 */
export function calcPercent(current, total) {
  if (!total || total <= 0) return 0;
  return Math.floor((current / total) * 100);
}

/**
 * Pick random item from array
 */
export function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Check if lucky draw is full
 */
export function isDrawFull(draw) {
  return (
    draw &&
    draw.totalSlots > 0 &&
    draw.filledSlots >= draw.totalSlots
  );
}
