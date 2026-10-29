/**
 * Calendar dates in the browser's local timezone (e.g. Asia/Karachi).
 * Avoid `new Date(y, m, 1).toISOString().split('T')[0]` — that shifts
 * to the previous day for UTC+ offsets (shows 31st of last month).
 */

export function formatLocalYmd(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function localToday() {
  return formatLocalYmd(new Date());
}

export function localFirstOfMonth(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return formatLocalYmd(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function localYearStart(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-01-01`;
}

/** Safe YYYY-MM-DD for API DATE / DATEONLY values (no UTC day shift). */
export function toLocalDateInputValue(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return formatLocalYmd(new Date(value));
}
