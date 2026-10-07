/**
 * Timezone-safe date string formatting.
 * Uses local date components, NOT toISOString() which converts to UTC.
 */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return toDateStr(d);
}

export function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return toDateStr(d);
}

export function getWeekStartDate(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getAllWeeks(seasonStartDate: string, seasonEndDate: string | null): string[] {
  const weeks: string[] = [];
  const endDate = seasonEndDate ?? todayStr();
  const startDate = new Date(seasonStartDate + "T00:00:00");
  const d = getWeekStartDate(startDate);

  while (true) {
    const ds = toDateStr(d);
    if (ds > endDate) break;
    weeks.push(ds);
    d.setDate(d.getDate() + 7);
  }
  return weeks;
}

export function getWeekNumber(seasonStart: string, weekStart: string): number {
  const start = new Date(seasonStart + "T00:00:00");
  const week = new Date(weekStart + "T00:00:00");
  const seasonWeekStart = getWeekStartDate(start);
  const diffMs = week.getTime() - seasonWeekStart.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export function formatWeekLabel(seasonStart: string, weekStart: string): string {
  const num = getWeekNumber(seasonStart, weekStart);
  return `${num}주차`;
}

export function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(date: string): string {
  const d = new Date(date + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatCurrency(amount: number): string {
  if (amount === 0) return "0원";
  const prefix = amount > 0 ? "+" : "";
  return `${prefix}${amount.toLocaleString("ko-KR")}원`;
}
