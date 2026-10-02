export function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Date -> YYYY-MM-DD（本地时区） */
export function toDateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Date -> HH:mm */
export function toTimeLabel(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 把「YYYY-MM-DD + HH:mm」拼成本地时间的 ISO 字符串 */
export function combineDateTime(dateKey: string, time: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

export function addMinutes(d: Date | string, min: number): Date {
  const date = typeof d === "string" ? new Date(d) : new Date(d.getTime());
  date.setMinutes(date.getMinutes() + min);
  return date;
}

export function startOfDay(d: Date | string): Date {
  const date = typeof d === "string" ? new Date(d) : new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date | string, n: number): Date {
  const date = startOfDay(d);
  date.setDate(date.getDate() + n);
  return date;
}

/** 周一为一周的第一天 */
export function startOfWeek(d: Date | string): Date {
  const date = startOfDay(d);
  const dow = (date.getDay() + 6) % 7;
  return addDays(date, -dow);
}

export function startOfMonth(d: Date | string): Date {
  const date = startOfDay(d);
  date.setDate(1);
  return date;
}

/** 生成月历的 6*7 网格 */
export function monthGrid(d: Date | string): Date[] {
  const first = startOfMonth(d);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function isSameDay(a: Date | string, b: Date | string) {
  return toDateKey(a) === toDateKey(b);
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function weekdayLabel(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return WEEKDAYS[date.getDay()];
}

export function dateLabel(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function fullDateLabel(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** ISO -> MM-DD HH:mm（本地时区） */
export function shortDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function ageFrom(birth: string | null | undefined): string {
  if (!birth) return "";
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 ? String(age) : "";
}

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** 生成病历号：YYMMDD + 3 位序号 */
export function genChartNo(seq: number): string {
  const d = new Date();
  const head = `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  return `${head}${String(seq).padStart(3, "0")}`;
}
