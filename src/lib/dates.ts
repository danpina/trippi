const MS_DAY = 86400000;

// Calendar days in UTC, matching how listing dates are stored (UTC midnight) so the numbers
// do not shift with the server's timezone.
function utcDay(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Length of the stay/plan in days (end minus start, minimum 1), and how far out it starts from
// today — the two numbers someone scanning a listing actually wants next to a date range.
export function tripMeta(dateStart: Date | string, dateEnd: Date | string, now: Date = new Date()) {
  const startDay = utcDay(new Date(dateStart));
  const endDay = utcDay(new Date(dateEnd));
  const todayDay = utcDay(now);

  const lengthDays = Math.max(1, Math.round((endDay - startDay) / MS_DAY));
  const daysAhead = Math.round((startDay - todayDay) / MS_DAY);

  const lengthLabel = `${lengthDays} day${lengthDays === 1 ? "" : "s"}`;
  const aheadLabel =
    daysAhead > 0
      ? `in ${daysAhead} day${daysAhead === 1 ? "" : "s"}`
      : daysAhead === 0
        ? "today"
        : `${Math.abs(daysAhead)} day${Math.abs(daysAhead) === 1 ? "" : "s"} ago`;

  return { lengthDays, daysAhead, lengthLabel, aheadLabel };
}

// Start of today in UTC — the cutoff for "has this listing already ended".
export function todayUtc(now: Date = new Date()) {
  return new Date(utcDay(now));
}
