export function parseTs(value: string): Date {
  if (!value) return new Date();
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const hasZone = /Z|[+-]\d\d:\d\d$/.test(normalized);
  const date = new Date(hasZone ? normalized : `${normalized}Z`);
  if (Number.isNaN(date.getTime())) return new Date(value);
  return date;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatClock(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parseTs(value));
}

export function formatChatListTime(value: string): string {
  if (!value) return "";
  const date = parseTs(value);
  const now = new Date();
  if (sameDay(date, now)) return formatClock(value);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "вчера";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatDayLabel(value: string): string {
  const date = parseTs(value);
  const now = new Date();
  if (sameDay(date, now)) return "Сегодня";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Вчера";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function dayKey(value: string): string {
  const date = parseTs(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
