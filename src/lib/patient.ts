import type { Patient } from "./db";

export function ageFromDob(dob?: string): string {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(+d)) return "";
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
  return y >= 0 && y < 130 ? String(y) : "";
}

export function displayAge(p: Patient): string {
  return ageFromDob(p.dob) || (p.age ?? "");
}

export interface Alert { label: string; level: "danger" | "warn"; }

// التنبيهات الطبية المهمة لطبيب الأسنان
export function medicalAlerts(p: Patient): Alert[] {
  const a: Alert[] = [];
  if (p.allergy?.trim()) a.push({ label: `حساسية: ${p.allergy.trim()}`, level: "danger" });
  if (p.bloodThinner) a.push({ label: "مميّع للدم", level: "danger" });
  if (p.pregnant) a.push({ label: "حامل", level: "warn" });
  if (p.chronic?.trim()) a.push({ label: p.chronic.trim(), level: "warn" });
  if (p.medications?.trim()) a.push({ label: `أدوية: ${p.medications.trim()}`, level: "warn" });
  if (p.smoker) a.push({ label: "مدخّن", level: "warn" });
  return a;
}

export const GENDER_LABEL: Record<string, string> = { male: "ذكر", female: "أنثى", "": "" };
