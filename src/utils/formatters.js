/**
 * Format coins display
 */
export function formatCoins(coins) {
  if (!coins) return "0";
  return coins.toLocaleString("en-IN");
}

/**
 * Shorten UID for UI
 */
export function shortUid(uid) {
  if (!uid) return "";
  return uid.substring(0, 6) + "..." + uid.slice(-4);
}

/**
 * Format timestamp to readable date
 */
export function formatDate(ts) {
  if (!ts) return "—";

  const date =
    ts.seconds
      ? new Date(ts.seconds * 1000)
      : new Date(ts);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
