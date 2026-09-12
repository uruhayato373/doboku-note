/** Search Analytics uses inclusive calendar dates in Pacific Time. */
export function calendarDate(now = new Date(), timeZone = 'America/Los_Angeles') {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '') || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error('Invalid calendar date');
  return value;
}
export function addDays(value, days) {
  const date = new Date(`${validDate(value)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function getDateRange(days = 28, now = new Date(), endDate = addDays(calendarDate(now), -3)) {
  if (!Number.isInteger(days) || days < 1 || days > 366) throw new Error('days must be an integer from 1 to 366');
  return { startDate: addDays(endDate, 1 - days), endDate: validDate(endDate) };
}
export function validateRange(startDate, endDate) {
  validDate(startDate); validDate(endDate);
  if (startDate > endDate) throw new Error('startDate must not follow endDate');
  return { startDate, endDate };
}
