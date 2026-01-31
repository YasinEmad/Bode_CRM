/**
 * Utilities for calculating working days in a month.
 * By default, treats Friday (5) as the only weekend day.
 */
export function countWorkdaysInMonth(year: number, monthIndex: number, weekendDays: number[] = [5]): number {
  // monthIndex: 0-based (0 = January)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let workdays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, monthIndex, d).getDay();
    if (!weekendDays.includes(dow)) {
      workdays += 1;
    }
  }

  return workdays;
}

export default countWorkdaysInMonth;

/**
 * Returns the total number of days in the given month.
 * monthIndex is 0-based (0 = January).
 */
export function countDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}
