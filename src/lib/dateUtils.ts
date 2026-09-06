let dayCutoffHour = 3;
/** Sets the active boundary */
export function setDayCutoffHour(hour: number): void {
  dayCutoffHour = hour;
}

/**Returns today's date (but before 1-4am is treated as the previous day) */
export function getTodayDate(): string {
  const now = new Date();

  // If it's before 1-4am, treat it as the previous day
  if (now.getHours() < dayCutoffHour){
    now.setDate(now.getDate() - 1);
  }

  return formatDateString(now);
}

/**Formats a Date object as YYYY-MM-DD*/
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**Returns the last N dates (including today) as YYYY-MM-DD strings, oldest first*/
export function getLastNDates(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    if (d.getHours() < dayCutoffHour) d.setDate(d.getDate() - 1);
    d.setDate(d.getDate() - i);
    dates.push(formatDateString(d));
  }
  return dates;
}