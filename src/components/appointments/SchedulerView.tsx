"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Appointment } from "@/lib/db";
import { useSettings } from "@/components/Providers";
import { ymd, m2t, addDays, startOfWeek, fmtArDate, WEEKDAYS_SHORT, DEFAULT_COLOR } from "@/lib/appt";

export function SchedulerView({ openBooking }: { openBooking: (init: Partial<Appointment>) => void }) {
  const { settings } = useSettings();
  const WS = settings.workStart, WE = settings.workEnd, SLOT = settings.slotMin;
  const NSLOT = Math.max(1, Math.round((WE - WS) / SLOT)), ROW = 50;
  const appts = useLiveQuery(() => db.appointments.toArray(), []) ?? [];
  const wait = useLiveQuery(() => db.waitlist.toArray(), []) ?? [];
  const [sel, setSel] = useState(new Date());
  const [mCur, setMCur] = useState(new Date());

  const dayAppts = (d: Date) => appts.filter((a) => a.date === ymd(d)).sort((a, b) => a.start - b.start);
  const list = dayAppts(sel);
  const slots = Array.from({ length: NSLOT }, (_, i) => WS + i * SLOT);
  const today = ymd(new Date());

  async function placeWait(w: typeof wait[number]) {
    const taken = dayAppts(sel);
    let m = WS;
    while (m < WE && taken.some((a) => m < a.start + a.dur && a.start < m + SLOT)) m += SLOT;
    await db.appointments.add({
      patientId: w.patientId ?? 0, patientName: w.patientName,
      date: ymd(sel), start: m, dur: SLOT, treat: w.treat, color: w.color, status: "upcoming",
    });
    await db.waitlist.delete(w.id!);
  }

  return (
    <div className="sched">
      {/* left: mini month + waitlist */}
      <div>
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="mini-head">
            <button className="chiptab" onClick={() => setMCur(new Date(mCur.getFullYear(), mCur.getMonth() - 1, 1))}>‹</button>
            <b style={{ fontSize: 13 }}>{fmtArDate(mCur, { month: "long", year: "numeric" })}</b>
            <button className="chiptab" onClick={() => setMCur(new Date(mCur.getFullYear(), mCur.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="mini-grid">
            {WEEKDAYS_SHORT.map((w) => <div key={w} className="mini-wd">{w}</div>)}
            {Array.from({ length: 42 }, (_, i) => {
              const day = addDays(startOfWeek(new Date(mCur.getFullYear(), mCur.getMonth(), 1)), i);
              const k = ymd(day);
              const cls = [day.getMonth() !== mCur.getMonth() ? "other" : "", k === ymd(sel) ? "sel" : "", k === today ? "today" : ""].join(" ");
              const has = appts.some((a) => a.date === k);
              return (
                <div key={i} className={`mini-cell ${cls}`} onClick={() => setSel(new Date(day))}>
                  {day.getDate()}{has && <span className="mini-pip" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 14 }}>⏳ قائمة الانتظار</h3>
          {wait.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 12, textAlign: "center", padding: 8 }}>لا أحد في الانتظار</div>
          ) : wait.map((w) => (
            <div key={w.id} className="wl-item">
              <span className="nm">{w.patientName}</span>
              <span className="tag" style={{ background: w.color }}>{w.treat}</span>
              <button className="chiptab active" onClick={() => placeWait(w)}>احجز</button>
              <button className="del" onClick={() => db.waitlist.delete(w.id!)}>×</button>
            </div>
          ))}
          <AddToWait />
        </div>
      </div>

      {/* right: day timeline */}
      <div className="card">
        <div className="kpis">
          <div className="kpi"><div className="v">{list.length}</div><div className="k">مواعيد اليوم</div></div>
          <div className="kpi"><div className="v" style={{ color: "var(--good)" }}>{list.filter((a) => a.status === "done").length}</div><div className="k">تم</div></div>
          <div className="kpi"><div className="v" style={{ color: "var(--accent)" }}>{list.filter((a) => a.status === "upcoming").length}</div><div className="k">قادمة</div></div>
        </div>
        <div className="appt-bar" style={{ marginBottom: 8 }}>
          <b>{fmtArDate(sel, { weekday: "long", day: "numeric", month: "long" })}</b>
          <div className="appt-nav right">
            <button onClick={() => setSel(addDays(sel, -1))}>‹</button>
            <button onClick={() => setSel(addDays(sel, 1))}>›</button>
          </div>
        </div>
        <div className="cal-day" style={{ maxHeight: 520, overflowY: "auto" }}>
          <div className="cal-times">{slots.map((m) => <div key={m} className="cal-timecell">{m2t(m)}</div>)}</div>
          <div className="cal-track" style={{ height: NSLOT * ROW }}>
            {slots.map((m) => <div key={m} className="cal-slot" style={{ height: ROW }}
              onClick={() => openBooking({ date: ymd(sel), start: m, dur: SLOT, treat: "", color: DEFAULT_COLOR, patientId: 0, status: "upcoming" })} />)}
            {list.map((a) => (
              <div key={a.id} className={`appt-block ${a.status}`}
                style={{ top: ((a.start - WS) / SLOT) * ROW, height: (a.dur / SLOT) * ROW - 4, background: a.color }}
                onClick={(e) => { e.stopPropagation(); openBooking(a); }}>
                <div className="nm">{a.patientName}</div>
                <div className="tt">{a.treat} • {m2t(a.start)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddToWait() {
  const patients = useLiveQuery(() => db.patients.orderBy("name").toArray(), []);
  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState(0);
  const [treat, setTreat] = useState("");
  if (!open) return <button className="chiptab" style={{ marginTop: 6 }} onClick={() => setOpen(true)}>+ إضافة للانتظار</button>;
  return (
    <div style={{ marginTop: 8 }}>
      <select className="select-sm" style={{ width: "100%", marginBottom: 6 }} value={pid} onChange={(e) => setPid(Number(e.target.value))}>
        <option value={0}>— اختر المريض —</option>
        {patients?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input className="search-input" style={{ marginBottom: 6 }} placeholder="نوع الإجراء" value={treat} onChange={(e) => setTreat(e.target.value)} />
      <div className="row" style={{ gap: 6 }}>
        <button className="btn" style={{ flex: 1, padding: 8 }} onClick={async () => {
          const p = patients?.find((x) => x.id === pid);
          if (!p || !treat.trim()) return;
          await db.waitlist.add({ patientId: pid, patientName: p.name, treat: treat.trim(), color: DEFAULT_COLOR });
          setPid(0); setTreat(""); setOpen(false);
        }}>إضافة</button>
        <button className="btn btn-ghost" style={{ flex: 1, padding: 8 }} onClick={() => setOpen(false)}>إلغاء</button>
      </div>
    </div>
  );
}
