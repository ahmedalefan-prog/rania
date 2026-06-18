// المنطق السني المشترك: الإجراءات، الأسطح، ترقيم FDI، الألوان
// مأخوذ من النموذج المعتمد

export type ProcKey =
  | "exam" | "caries" | "filling" | "composite" | "rct" | "post"
  | "crown" | "bridge" | "implant" | "extract" | "ortho"
  | "cleaning" | "whitening" | "other";

export type SurfaceKey = "B" | "M" | "O" | "D" | "L";
export type Status = "done" | "planned";

export interface Procedure {
  key: ProcKey;
  name: string;
  color: string;
  cost: number;
  whole: boolean; // إجراء على كامل السن أم على سطح
}

export const PROCEDURES: Procedure[] = [
  { key: "exam",      name: "فحص",            color: "#94a3b8", cost: 0,   whole: true },
  { key: "caries",    name: "تسوس",           color: "#b45309", cost: 0,   whole: false },
  { key: "filling",   name: "حشوة",           color: "#1d4ed8", cost: 50,  whole: false },
  { key: "composite", name: "حشوة تجميلية",   color: "#06b6d4", cost: 80,  whole: false },
  { key: "rct",       name: "علاج عصب",       color: "#eab308", cost: 150, whole: true },
  { key: "post",      name: "وتد",            color: "#f59e0b", cost: 60,  whole: true },
  { key: "crown",     name: "تلبيسة",         color: "#16a34a", cost: 300, whole: true },
  { key: "bridge",    name: "جسر",            color: "#15803d", cost: 500, whole: true },
  { key: "implant",   name: "زراعة",          color: "#2563eb", cost: 900, whole: true },
  { key: "extract",   name: "قلع",            color: "#dc2626", cost: 70,  whole: true },
  { key: "ortho",     name: "تقويم",          color: "#9333ea", cost: 200, whole: true },
  { key: "cleaning",  name: "تنظيف",          color: "#14b8a6", cost: 40,  whole: true },
  { key: "whitening", name: "تبييض",          color: "#e879f9", cost: 120, whole: true },
  { key: "other",     name: "أخرى",           color: "#6b7280", cost: 0,   whole: false },
];

export const PROC_MAP: Record<ProcKey, Procedure> = Object.fromEntries(
  PROCEDURES.map((p) => [p.key, p]),
) as Record<ProcKey, Procedure>;

// القيم الأصلية للأسماء والألوان (مرجع ثابت لا يتغيّر) — تُستخدم كافتراضي وكـ placeholder
export const DEFAULT_PROC_NAME: Record<ProcKey, string> = Object.fromEntries(
  PROCEDURES.map((p) => [p.key, p.name]),
) as Record<ProcKey, string>;
export const DEFAULT_PROC_COLOR: Record<ProcKey, string> = Object.fromEntries(
  PROCEDURES.map((p) => [p.key, p.color]),
) as Record<ProcKey, string>;

// تطبيق تسميات/ألوان الخدمات المخصّصة من الإعدادات على الكائنات المشتركة
// (PROC_MAP يشير لنفس كائنات PROCEDURES، لذا التعديل ينعكس في كل المستهلكين بما فيهم pcol وتوليد الـ SVG)
export function applyProcOverrides(
  names?: Record<string, string>,
  colors?: Record<string, string>,
): void {
  for (const p of PROCEDURES) {
    p.name = names?.[p.key]?.trim() || DEFAULT_PROC_NAME[p.key];
    p.color = colors?.[p.key] || DEFAULT_PROC_COLOR[p.key];
  }
}

export const SOUND = "#f1f5f9";
export const TERMINAL: ProcKey[] = ["extract", "implant"]; // تُنهي السن وتلغي ما سبق

export const ABBR: Partial<Record<ProcKey, string>> = {
  exam: "ف", rct: "ع", post: "و", crown: "ت", bridge: "ج",
  implant: "ز", extract: "✕", ortho: "ق", cleaning: "ن", whitening: "ب",
};

export const SURFACES: { key: SurfaceKey; name: string; label: string }[] = [
  { key: "B", name: "خارجي", label: "Buccal" },
  { key: "M", name: "إنسي",  label: "Mesial" },
  { key: "O", name: "إطباقي", label: "Occlusal" },
  { key: "D", name: "وحشي",  label: "Distal" },
  { key: "L", name: "لساني", label: "Lingual" },
];

export const SURFACE_NAME: Record<SurfaceKey, string> = Object.fromEntries(
  SURFACES.map((s) => [s.key, s.name]),
) as Record<SurfaceKey, string>;

// ترقيم FDI الدولي
export const ADULT = {
  upper: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  lower: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
};
export const CHILD = {
  upper: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
  lower: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
};

export function isAnterior(toothId: number): boolean {
  return [1, 2, 3].includes(Number(String(toothId)[1]));
}

export function pcol(key: ProcKey): string {
  return PROC_MAP[key]?.color ?? SOUND;
}
