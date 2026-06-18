// أدوات المواعيد + إعدادات الإجراءات والألوان

export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const m2t = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const t2m = (t: string) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
// الأسبوع يبدأ السبت
export const startOfWeek = (d: Date) => { const x = new Date(d); return addDays(x, -((x.getDay() + 1) % 7)); };

export const WEEKDAYS_SHORT = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];
export const WEEKDAYS = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

export const TREAT_PRESETS: { k: string; c: string }[] = [
  { k: "مراجعة", c: "#38bdf8" }, { k: "حشوة", c: "#1d4ed8" }, { k: "علاج عصب", c: "#eab308" },
  { k: "تلبيسة", c: "#16a34a" }, { k: "زراعة", c: "#2563eb" }, { k: "خلع", c: "#dc2626" },
  { k: "تقويم", c: "#9333ea" }, { k: "تنظيف", c: "#14b8a6" }, { k: "تبييض", c: "#e879f9" },
  { k: "أخرى", c: "#6b7280" },
];

export const COLORS = [
  "#38bdf8", "#1d4ed8", "#06b6d4", "#14b8a6", "#16a34a", "#eab308",
  "#f59e0b", "#dc2626", "#e879f9", "#9333ea", "#6b7280",
];

export const DEFAULT_COLOR = "#38bdf8";

export const fmtArDate = (d: Date, opts: Intl.DateTimeFormatOptions) =>
  d.toLocaleDateString("ar", opts);
