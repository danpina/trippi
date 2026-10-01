const MS_DAY = 86400000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Length of the stay/plan in days, and how far out it starts from today — the two numbers
// someone scanning a listing actually wants next to a date range.
export function tripMeta(dateStart: Date | string, dateEnd: Date | string) {
  const startDay = startOfDay(new Date(dateStart));
  const endDay = startOfDay(new Date(dateEnd));
  const todayDay = startOfDay(new Date());

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
