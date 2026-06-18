"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, ChevronLeft, Phone, Briefcase, Wallet } from "lucide-react";
import { db, type Employee, type AttStatus, type Attendance } from "@/lib/db";
import { useSettings } from "@/components/Providers";
import { ymd, addDays, startOfWeek, fmtArDate, WEEKDAYS_SHORT } from "@/lib/appt";

type Kind = "week" | "month" | "year";
const CYCLE: (AttStatus | undefined)[] = [undefined, "present", "absent", "leave"];
const pad = (n: number) => String(n).padStart(2, "0");

export function AttendanceModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const { settings } = useSettings();
  const cur = settings.currency;
  const [kind, setKind] = useState<Kind>("month");
  const [ref, setRef] = useState(new Date());

  const records = useLiveQuery(
    () => db.attendance.where("employeeId").equals(employee.id!).toArray(),
    [employee.id],
  ) ?? [];
  const map: Record<string, { id: number; status: AttStatus }> = {};
  for (const r of records) map[r.date] = { id: r.id!, status: r.status };

  async function cycle(date: string) {
    const rec = map[date];
    const next = CYCLE[(CYCLE.indexOf(rec?.status) + 1) % CYCLE.length];
    if (!next) { if (rec) await db.attendance.delete(rec.id); }
    else if (rec) await db.attendance.update(rec.id, { status: next });
    else await db.attendance.add({ employeeId: employee.id!, date, status: next });
  }

  // نطاق الفترة المعروضة
  const weekStart = startOfWeek(ref);
  const inPeriod = (d: string) => {
    if (kind === "week") return d >= ymd(weekStart) && d <= ymd(addDays(weekStart, 6));
    if (kind === "month") return d.startsWith(`${ref.getFullYear()}-${pad(ref.getMonth() + 1)}`);
    return d.startsWith(`${ref.getFullYear()}-`);
  };
  const periodRecs = records.filter((r) => inPeriod(r.date));
  const count = (s: AttStatus) => periodRecs.filter((r) => r.status === s).length;
  const present = count("present"), absent = count("absent"), leave = count("leave");
  const commit = present + absent > 0 ? Math.round((present / (present + absent)) * 100) : null;

  // الراتب
  const salary = employee.salary || 0;
  const daily = salary / 30;
  const deduction = Math.round(daily * absent);
  const net = salary - deduction;

  function move(dir: number) {
    if (kind === "week") setRef(addDays(ref, dir * 7));
    else if (kind === "month") setRef(new Date(ref.getFullYear(), ref.getMonth() + dir, 1));
    else setRef(new Date(ref.getFullYear() + dir, ref.getMonth(), 1));
  }
  const label =
    kind === "week" ? `${fmtArDate(weekStart, { day: "numeric", month: "short" })} – ${fmtArDate(addDays(weekStart, 6), { day: "numeric", month: "short" })}`
    : kind === "month" ? fmtArDate(ref, { month: "long", year: "numeric" })
    : String(ref.getFullYear());

  const today = ymd(new Date());

  return (
    <div className="overlay center show" onClick={(e) => { if ((e.target as Element).classList.contains("overlay")) onClose(); }}>
      <div className="dialog report-modal">
        <h3>تقرير الموظف: {employee.name}</h3>

        {/* معلومات سريعة */}
        <div className="emp-info">
          {employee.role && <span><Briefcase size={14} /> {employee.role}</span>}
          {employee.phone && <span><Phone size={14} /> {employee.phone}</span>}
          <span><Wallet size={14} /> {salary} {cur} / شهر</span>
        </div>

        {/* تبويبات الفترة */}
        <div className="tabs" style={{ marginTop: 6 }}>
          <button className={`tab ${kind === "week" ? "active" : ""}`} onClick={() => setKind("week")}>أسبوعي</button>
          <button className={`tab ${kind === "month" ? "active" : ""}`} onClick={() => setKind("month")}>شهري</button>
          <button className={`tab ${kind === "year" ? "active" : ""}`} onClick={() => setKind("year")}>سنوي</button>
        </div>

        <div className="att-month-nav">
          <button className="chiptab" onClick={() => move(-1)}><ChevronRight size={16} /></button>
          <b>{label}</b>
          <button className="chiptab" onClick={() => move(1)}><ChevronLeft size={16} /></button>
        </div>

        {/* إحصائيات الفترة */}
        <div className="att-summary">
          <div className="att-sum"><div className="v" style={{ color: "var(--good)" }}>{present}</div><div className="k">حاضر</div></div>
          <div className="att-sum"><div className="v" style={{ color: "var(--danger)" }}>{absent}</div><div className="k">غائب</div></div>
          <div className="att-sum"><div className="v" style={{ color: "#f59e0b" }}>{leave}</div><div className="k">إجازة</div></div>
          <div className="att-sum"><div className="v" style={{ color: "var(--accent)" }}>{commit == null ? "—" : `${commit}%`}</div><div className="k">الالتزام</div></div>
        </div>

        {/* الراتب */}
        <div className="balance"><span>الراتب الشهري</span><span className="amt">{salary} {cur}</span></div>
        <div className="balance" style={{ marginTop: 8 }}>
          <span>خصم الغياب في الفترة (تقديري — {absent} يوم)</span>
          <span className="amt" style={{ color: "var(--danger)" }}>−{deduction} {cur}</span>
        </div>
        <div className="balance" style={{ marginTop: 8 }}>
          <span>الصافي بعد الخصم</span><span className="amt" style={{ color: "var(--good)" }}>{net} {cur}</span>
        </div>

        {/* العرض حسب الفترة */}
        <h4 className="sec-title" style={{ marginTop: 18 }}>
          {kind === "year" ? "ملخّص الأشهر" : "سجل الحضور — اضغط اليوم لتبديل الحالة"}
        </h4>

        {kind === "year" ? (
          <div className="year-grid">
            {Array.from({ length: 12 }, (_, m) => {
              const mr = records.filter((r) => r.date.startsWith(`${ref.getFullYear()}-${pad(m + 1)}`));
              const p = mr.filter((r) => r.status === "present").length;
              const a = mr.filter((r) => r.status === "absent").length;
              const monthName = new Date(ref.getFullYear(), m, 1).toLocaleDateString("ar", { month: "long" });
              return (
                <div key={m} className="ymon">
                  <div className="ym-name">{monthName}</div>
                  <div className="ym-stat"><span style={{ color: "var(--good)" }}>{p}</span> / <span style={{ color: "var(--danger)" }}>{a}</span></div>
                </div>
              );
            })}
          </div>
        ) : (
          <AttGrid kind={kind} ref0={ref} map={map} cycle={cycle} today={today} />
        )}

        <div className="att-legend" style={{ marginTop: 10 }}>
          <span><span className="d" style={{ background: "rgba(34,197,94,.5)" }} />حاضر</span>
          <span><span className="d" style={{ background: "rgba(239,68,68,.5)" }} />غائب</span>
          <span><span className="d" style={{ background: "rgba(245,158,11,.5)" }} />إجازة</span>
          <span className="muted">(في العرض السنوي: حاضر / غائب)</span>
        </div>

        <div className="sheet-actions">
          <button className="btn btn-ghost" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}

function AttGrid({ kind, ref0, map, cycle, today }: {
  kind: Kind; ref0: Date; map: Record<string, { id: number; status: AttStatus }>;
  cycle: (d: string) => void; today: string;
}) {
  const days: Date[] = kind === "week"
    ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(ref0), i))
    : Array.from({ length: 42 }, (_, i) => addDays(startOfWeek(new Date(ref0.getFullYear(), ref0.getMonth(), 1)), i));
  return (
    <div className="att-grid">
      {WEEKDAYS_SHORT.map((w) => <div key={w} className="att-wd">{w}</div>)}
      {days.map((day, i) => {
        const k = ymd(day);
        const other = kind === "month" && day.getMonth() !== ref0.getMonth();
        const weekend = day.getDay() === 5;
        const st = map[k]?.status;
        return (
          <div key={i}
            className={`att-cell ${other ? "other" : ""} ${weekend ? "weekend" : ""} ${k === today ? "today" : ""} ${st ?? ""}`}
            onClick={() => cycle(k)}>
            {day.getDate()}
          </div>
        );
      })}
    </div>
  );
}
