export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}

export function formatCurrency(amount: number): string {
  if (amount === 0) return "0원";
  const prefix = amount > 0 ? "+" : "";
  return `${prefix}${amount.toLocaleString("ko-KR")}원`;
}
