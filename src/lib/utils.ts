export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

export function isCurrentWeekComplete(): boolean {
  const now = new Date();
  return now.getDay() === 1 && now.getHours() === 0;
}

export function getCompletedWeekStart(): string {
  const now = new Date();
  const currentWeek = getWeekStart(now);
  return currentWeek;
}

export function getWeekNumber(seasonStart: string, weekStart: string): number {
  const start = new Date(seasonStart + "T00:00:00");
  const week = new Date(weekStart + "T00:00:00");
  const seasonWeekStart = new Date(start);
  const day = seasonWeekStart.getDay();
  seasonWeekStart.setDate(seasonWeekStart.getDate() - day + (day === 0 ? -6 : 1));
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
