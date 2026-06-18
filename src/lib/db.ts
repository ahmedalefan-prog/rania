import Dexie, { type Table } from "dexie";
import { PROCEDURES, type ProcKey, type SurfaceKey, type Status } from "./dental";

// ===== الأنواع =====
export interface Patient {
  id?: number;
  name: string;
  fileNo?: string;          // رقم الملف
  gender?: "male" | "female" | "";
  dob?: string;             // تاريخ الميلاد YYYY-MM-DD
  age?: string;             // عمر يدوي (احتياطي إن لم يُدخل تاريخ الميلاد)
  phone?: string;
  // التاريخ الطبي (مهم لطبيب الأسنان)
  allergy?: string;         // الحساسية
  chronic?: string;         // الأمراض المزمنة
  medications?: string;     // الأدوية الحالية
  smoker?: boolean;
  pregnant?: boolean;
  bloodThinner?: boolean;   // مميّعات الدم
  notes?: string;
  createdAt: number;
}

export interface SurfaceState {
  key: ProcKey;
  status: Status;
  eid: string; // يربط بحدث السجل الزمني
}
export interface ToothState {
  surfaces: Partial<Record<SurfaceKey, SurfaceState>>;
  conditions: { key: ProcKey; status: Status; eid: string }[];
}
// مخطط أسنان المريض (لقطة الحالة الحالية)
export interface Chart {
  patientId: number;
  teeth: Record<number, ToothState>;
}

// حدث في السجل الزمني (التاريخ الكامل)
export interface ClinicalEvent {
  id?: number;
  eid: string;
  patientId: number;
  toothId: number;
  surface: string;          // اسم السطح بالعربية (لقطة) أو "" لإجراء كامل السن
  surfaceKey?: SurfaceKey;  // مفتاح السطح — يُحلّ اسمه حياً ليسري التعديل رجعياً (قد يغيب في السجلات القديمة)
  procKey: ProcKey;
  procName: string;
  color: string;
  status: Status;
  cost: number;
  dateISO: string; // YYYY-MM-DD
  createdAt: number;
}

export interface Appointment {
  id?: number;
  patientId: number;
  patientName: string;
  date: string;   // YYYY-MM-DD
  start: number;  // دقائق من منتصف الليل
  dur: number;    // المدة بالدقائق
  treat: string;  // نوع الإجراء (نص حر)
  color: string;  // لون الموعد
  status: "upcoming" | "done" | "cancelled" | "noshow";
}

export interface WaitItem {
  id?: number;
  patientId?: number;
  patientName: string;
  treat: string;
  color: string;
}

export interface Transaction {
  id?: number;
  type: "income" | "expense";
  category: string; // مراجعين، راتب، إيجار، كهرباء، مشتريات...
  amount: number;
  dateISO: string;
  note?: string;
  patientId?: number;
  eid?: string; // يربط الحركة بإجراء سريري (دخل تلقائي)
}

export interface Employee {
  id?: number;
  name: string;
  role?: string;
  salary?: number;
  phone?: string;
  notes?: string;
}

// صورة أو أشعة مرفقة بملف المريض (تُخزَّن كـ dataURL ليبقى متوافقاً مع النسخ الاحتياطي)
export interface Attachment {
  id?: number;
  patientId: number;
  kind: "photo" | "xray"; // صورة عيادية | أشعة
  name: string;           // اسم/وصف اختياري
  data: string;           // dataURL (base64) للصورة بعد الضغط
  dateISO: string;        // YYYY-MM-DD
  createdAt: number;
}

export type AttStatus = "present" | "absent" | "leave";
export interface Attendance {
  id?: number;
  employeeId: number;
  date: string; // YYYY-MM-DD
  status: AttStatus;
}

export interface Settings {
  key: "app";
  theme: "dark" | "light";
  toothStyle: "box" | "anat";
  apptView: "calendar" | "scheduler";
  workStart: number; // دقائق
  workEnd: number;
  slotMin: number;
  clinicName: string;
  currency: string;
  prices: Record<string, number>;     // تسعيرة الخدمات حسب نوع الإجراء
  procNames: Record<string, string>;  // تسميات مخصّصة للخدمات (فارغ = الاسم الافتراضي)
  procColors: Record<string, string>; // ألوان مخصّصة للخدمات (فارغ = اللون الافتراضي)
  surfNames: Record<string, string>;  // أسماء عربية مخصّصة لأسطح السن
  surfLabels: Record<string, string>; // تسميات إنجليزية مخصّصة لأسطح السن
}

const DEFAULT_PRICES: Record<string, number> = Object.fromEntries(
  PROCEDURES.map((p) => [p.key, p.cost]),
);

export const DEFAULT_SETTINGS: Settings = {
  key: "app",
  theme: "dark",
  toothStyle: "box",
  apptView: "calendar",
  workStart: 9 * 60,
  workEnd: 18 * 60,
  slotMin: 30,
  clinicName: "عيادة د. رانيا للأسنان",
  currency: "$",
  prices: DEFAULT_PRICES,
  procNames: {},
  procColors: {},
  surfNames: {},
  surfLabels: {},
};

export class ClinicDB extends Dexie {
  patients!: Table<Patient, number>;
  charts!: Table<Chart, number>;
  events!: Table<ClinicalEvent, number>;
  appointments!: Table<Appointment, number>;
  transactions!: Table<Transaction, number>;
  employees!: Table<Employee, number>;
  waitlist!: Table<WaitItem, number>;
  attendance!: Table<Attendance, number>;
  attachments!: Table<Attachment, number>;
  settings!: Table<Settings, string>;

  constructor() {
    super("raniaClinic");
    this.version(1).stores({
      patients: "++id, name, createdAt",
      charts: "patientId",
      events: "++id, eid, patientId, toothId, dateISO, status",
      appointments: "++id, patientId, datetime, status",
      transactions: "++id, type, category, dateISO",
      employees: "++id, name",
      settings: "key",
    });
    // الإصدار 2: مواعيد بفترات زمنية + قائمة انتظار
    this.version(2).stores({
      appointments: "++id, patientId, date, status",
      waitlist: "++id",
    }).upgrade(async (tx) => {
      await tx.table("appointments").clear(); // الصيغة القديمة غير متوافقة
    });
    // الإصدار 3: حضور الموظفين
    this.version(3).stores({
      attendance: "++id, employeeId, date, [employeeId+date]",
    });
    // الإصدار 4: مرفقات (صور وأشعة) لملف المريض
    this.version(4).stores({
      attachments: "++id, patientId, kind, createdAt",
    });
  }
}

export const db = new ClinicDB();

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get("app");
  if (s) return s;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
