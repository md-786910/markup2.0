// Calendar-month arithmetic for billing periods, in UTC.
// Date#setMonth overflows (Jan 31 + 1 month = Mar 3) and uses server-local time;
// this clamps to the last day of the target month instead (Jan 31 -> Feb 28/29).
function addMonthsUTC(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(
    d.getUTCFullYear(), d.getUTCMonth() + months, 1,
    d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds(),
  ));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

module.exports = { addMonthsUTC };
