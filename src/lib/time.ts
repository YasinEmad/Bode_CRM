export function formatMinutesToHours(totalMinutes: number | null | undefined) {
  const mins = Number(totalMinutes) || 0;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatMinutesWithPlus(totalMinutes: number | null | undefined) {
  const formatted = formatMinutesToHours(totalMinutes);
  return `+${formatted}`;
}
