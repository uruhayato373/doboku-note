/** Assign every visible calendar cell its real date, including adjacent-month cells. */
export function assessInstagramPlanner({ body, days, chips, expected = '', expectedText = '' }) {
  const monthFirst = body.match(/(?:^|\n)\s*(\d{1,2})月\s*(\d{4})年/);
  const yearFirst = body.match(/(?:^|\n)\s*(\d{4})年\s*(\d{1,2})月/);
  const year = Number(monthFirst?.[2] ?? yearFirst?.[1]);
  const month = Number(monthFirst?.[1] ?? yearFirst?.[2]);
  const cells = [...new Map(days.map(d => [`${d.x}:${d.y}`, d])).values()].sort((a, b) => a.y - b.y || a.x - b.x);
  const calendarReady = Number.isInteger(year) && month >= 1 && month <= 12 && cells.length >= 28;
  const daySlots = {}, dateSlots = {};
  if (calendarReady) {
    let offset = Number(cells[0].day.replace('日', '')) === 1 ? 0 : -1;
    let previous = 0;
    for (const cell of cells) {
      const day = Number(cell.day.replace('日', ''));
      if (day === 1 && previous > 20) offset++;
      cell.date = new Date(Date.UTC(year, month - 1 + offset, day)).toISOString().slice(0, 10);
      previous = day;
    }
    for (const chip of chips) {
      let best = null, distance = Infinity;
      for (const cell of cells) {
        if (chip.y < cell.y || Math.abs(chip.x - cell.x) >= 80 || chip.y - cell.y >= 260) continue;
        const delta = Math.abs(chip.x - cell.x) + (chip.y - cell.y) * 0.2;
        if (delta < distance) { best = cell; distance = delta; }
      }
      if (best) {
        (dateSlots[best.date] ||= []).push(chip.time);
        if (best.date.slice(0, 7) === `${year}-${String(month).padStart(2, '0')}`) (daySlots[best.day] ||= []).push(chip.time);
      }
    }
  }
  const visibleMonth = calendarReady ? `${year}-${String(month).padStart(2, '0')}` : null;
  const monthFound = !expected || visibleMonth === expected.slice(0, 7);
  const timeFound = !expected || chips.some(chip => chip.time === expected.slice(11, 16));
  const dateTimeFound = !expected || (dateSlots[expected.slice(0, 10)] || []).includes(expected.slice(11, 16));
  const textFound = !expectedText || body.includes(expectedText);
  return { calendarReady, visibleMonth, monthFound, timeFound, dateTimeFound, textFound,
    pass: calendarReady && monthFound && dateTimeFound && textFound, daySlots, dateSlots,
    timeChips: [...new Set(chips.map(chip => chip.time))].sort() };
}
