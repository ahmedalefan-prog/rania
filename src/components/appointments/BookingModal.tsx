"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Appointment } from "@/lib/db";
import { useUI } from "@/components/ui";
import { m2t, t2m, TREAT_PRESETS, COLORS, DEFAULT_COLOR } from "@/lib/appt";

export function BookingModal({ init, onClose }: { init: Partial<Appointment> | null; onClose: () => void }) {
  const { toast, confirm } = useUI();
  const patients = useLiveQuery(() => db.patients.orderBy("name").toArray(), []);
  const [patientId, setPatientId] = useState(0);
  const [treat, setTreat] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [time, setTime] = useState("09:00");
  const [dur, setDur] = useState(30);
  const [status, setStatus] = useState<Appointment["status"]>("upcoming");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!init) return;
    setPatientId(init.patientId ?? 0);
    setTreat(init.treat ?? "");
    setColor(init.color ?? DEFAULT_COLOR);
    setTime(m2t(init.start ?? 540));
    setDur(init.dur ?? 30);
    setStatus(init.status ?? "upcoming");
    setTouched(false);
  }, [init]);

  // كل الـ hooks قبل أي return مشروط
  const sameDay = useLiveQuery(
    () => (init?.date ? db.appointments.where("date").equals(init.date).toArray() : Promise.resolve([] as Appointment[])),
    [init?.date],
  ) ?? [];

  if (!init) return null;
  const isEdit = !!init.id;
  const noPatients = (patients?.length ?? 0) === 0;
  const startM = t2m(time);
  const conflict = sameDay.some((a) => a.id !== init.id && startM < a.start + a.dur && a.start < startM + dur);

  async function save() {
    setTouched(true);
    if (!patientId || !treat.trim()) return;
    const p = patients?.find((x) => x.id === patientId);
    const rec: Appointment = {
      patientId, patientName: p?.name ?? "",
      date: init!.date!, start: t2m(time), dur, treat: treat.trim(), color, status,
    };
    if (isEdit) await db.appointments.update(init!.id!, rec);
    else await db.appointments.add(rec);
    toast(isEdit ? "تم تحديث الموعد" : "تمت إضافة الموعد");
    onClose();
  }
  async function remove() {
    const ok = await confirm({ title: "حذف هذا الموعد؟", confirmText: "حذف", danger: true });
    if (ok) { await db.appointments.delete(init!.id!); toast("تم حذف الموعد", "info"); onClose(); }
  }

  return (
    <div className="overlay center show" onClick={(e) => { if ((e.target as Element).classList.contains("overlay")) onClose(); }}>
      <div className="dialog" style={{ maxWidth: 420 }}>
        <h3>{isEdit ? "تعديل الموعد" : "موعد جديد"}</h3>

        {noPatients ? (
          <p className="hint">أضف مريضاً أولاً من صفحة المرضى لتتمكن من حجز موعد له.</p>
        ) : (
          <>
            {conflict && <div className="warn-line">⚠ يتعارض مع موعد آخر في نفس الوقت</div>}

            <div className="field">
              <label>المريض *</label>
              <select className={touched && !patientId ? "invalid" : ""} value={patientId}
                onChange={(e) => setPatientId(Number(e.target.value))}>
                <option value={0}>— اختر —</option>
                {patients?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="field">
              <label>نوع الإجراء * (اكتب أو اختر)</label>
              <input className={touched && !treat.trim() ? "invalid" : ""} value={treat}
                placeholder="اكتب الإجراء..." onChange={(e) => setTreat(e.target.value)} />
              <div className="treat-presets">
                {TREAT_PRESETS.map((t) => (
                  <button key={t.k} type="button"
                    onClick={() => { setTreat(t.k); setColor(t.c); }}>
                    <span className="dot" style={{ background: t.c }} />{t.k}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>اللون</label>
              <div className="color-row">
                {COLORS.map((c) => (
                  <span key={c} className={`color-sw ${color === c ? "active" : ""}`}
                    style={{ background: c }} onClick={() => setColor(c)} />
                ))}
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                  style={{ width: 34, height: 28, padding: 0, border: "none", background: "none", cursor: "pointer" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <div className="field" style={{ flex: 1 }}><label>الوقت</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
              <div className="field" style={{ flex: 1 }}><label>المدة (دقيقة)</label>
                <select value={dur} onChange={(e) => setDur(Number(e.target.value))}>
                  {[15, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d}</option>)}
                </select></div>
            </div>

            {isEdit && (
              <div className="field"><label>الحالة</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as Appointment["status"])}>
                  <option value="upcoming">قادم</option>
                  <option value="done">تم</option>
                  <option value="noshow">لم يحضر</option>
                  <option value="cancelled">ملغي</option>
                </select></div>
            )}
          </>
        )}

        <div className="sheet-actions">
          {!noPatients && <button className="btn" onClick={save}>{isEdit ? "حفظ" : "إضافة"}</button>}
          {isEdit && <button className="btn btn-danger" onClick={remove}>حذف</button>}
          <button className="btn btn-ghost" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
