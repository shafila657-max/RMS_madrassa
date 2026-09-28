// Today's date as YYYY-MM-DD in the device's own time zone.
// (new Date().toISOString() is UTC, which in India gives yesterday's date before 5:30 am.)
export const localDateString = (date = new Date()) => {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().split('T')[0];
};
