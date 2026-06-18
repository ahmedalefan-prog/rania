"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Appointment } from "@/lib/db";
import { useSettings } from "@/components/Providers";
import { ymd, m2t, addDays, startOfWeek, fmtArDate, WEEKDAYS, DEFAULT_COLOR } from "@/lib/appt";

type View = "day" | "week" | "month";

export function CalendarView({ openBooking }: { openBooking: (init: Partial<Appointment>) => void }) {
  const { settings } = useSettings();
  const WS = settings.workStart, WE = settings.workEnd, SLOT = settings.slotMin;
  const NSLOT = Math.max(1, Math.round((WE - WS) / SLOT));
  const ROW = 50, WROW = 38;
  const appts = useLiveQuery(() => db.appointments.toArray(), []) ?? [];
  const [view, setView] = useState<View>("day");
  const [cur, setCur] = useState(new Date());

  const dayAppts = (d: Date) => appts.filter((a) => a.date === ymd(d)).sort((a, b) => a.start - b.start);
  const newAt = (date: string, start: number) =>
    openBooking({ date, start, dur: SLOT, treat: "", color: DEFAULT_COLOR, patientId: 0, status: "upcoming" });

  function move(dir: number) {
    if (view === "day") setCur(addDays(cur, dir));
    else if (view === "week") setCur(addDays(cur, dir * 7));
    else setCur(new Date(cur.getFullYear(), cur.getMonth() + dir, 1));
  }

  const label =
    view === "day" ? fmtArDate(cur, { weekday: "long", day: "numeric", month: "long" })
    : view === "week" ? `${fmtArDate(startOfWeek(cur), { day: "numeric", month: "short" })} – ${fmtArDate(addDays(startOfWeek(cur), 6), { day: "numeric", month: "short" })}`
    : fmtArDate(cur, { month: "long", year: "numeric" });

  const slots = Array.from({ length: NSLOT }, (_, i) => WS + i * SLOT);
  const today = ymd(new Date());

  return (
    <>
      <div className="appt-bar">
        <div className="appt-nav">
          <button onClick={() => move(-1)}>‹</button>
          <span className="curlabel">{label}</span>
          <button onClick={() => move(1)}>›</button>
        </div>
        <button className="chiptab" onClick={() => setCur(new Date())}>اليوم</button>
        <div className="seg">
          {(["day", "week", "month"] as View[]).map((v) => (
            <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)}>
              {v === "day" ? "يوم" : v === "week" ? "أسبوع" : "شهر"}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {view === "day" && (
          <div className="cal-day">
            <div className="cal-times">{slots.map((m) => <div key={m} className="cal-timecell">{m2t(m)}</div>)}</div>
            <div className="cal-track" style={{ height: NSLOT * ROW }}>
              {slots.map((m) => <div key={m} className="cal-slot" style={{ height: ROW }} onClick={() => newAt(ymd(cur), m)} />)}
              {dayAppts(cur).map((a) => (
                <div key={a.id} className={`appt-block ${a.status}`}
                  style={{ top: ((a.start - WS) / SLOT) * ROW, height: (a.dur / SLOT) * ROW - 4, background: a.color }}
                  onClick={(e) => { e.stopPropagation(); openBooking(a); }}>
                  <div className="nm">{a.patientName}</div>
                  <div className="tt">{a.treat} • {m2t(a.start)}{a.status === "done" ? " ✓" : a.status === "noshow" ? " ✕" : ""}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "week" && (
          <div className="cal-week">
            <div className="cal-wktimes">
              <div style={{ height: 40 }} />
              {slots.map((m) => <div key={m} className="cal-wktime">{m2t(m)}</div>)}
            </div>
            <div className="cal-wkcols">
              {Array.from({ length: 7 }, (_, c) => {
                const day = addDays(startOfWeek(cur), c); const k = ymd(day);
                return (
                  <div key={c} className="cal-wkcol">
                    <div className={`cal-wkhead ${k === today ? "today" : ""}`}>
                      <div>{fmtArDate(day, { weekday: "short" })}</div>{day.getDate()}
                    </div>
                    <div className="cal-wktrack" style={{ height: NSLOT * WROW }}>
                      {slots.map((m) => <div key={m} className="cal-wkslot" style={{ height: WROW }} onClick={() => newAt(k, m)} />)}
                      {dayAppts(day).map((a) => (
                        <div key={a.id} className="cal-wkappt"
                          style={{ top: ((a.start - WS) / SLOT) * WROW, height: (a.dur / SLOT) * WROW - 2, background: a.color }}
                          onClick={(e) => { e.stopPropagation(); openBooking(a); }}>
                          {a.patientName.split(" ")[0]}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "month" && (
          <div className="cal-month">
            {WEEKDAYS.map((w) => <div key={w} className="cal-wd">{w}</div>)}
            {Array.from({ length: 42 }, (_, i) => {
              const day = addDays(startOfWeek(new Date(cur.getFullYear(), cur.getMonth(), 1)), i);
              const k = ymd(day); const list = dayAppts(day); const other = day.getMonth() !== cur.getMonth();
              return (
                <div key={i} className={`cal-mday ${other ? "other" : ""} ${k === today ? "today" : ""}`}
                  onClick={() => { setCur(day); setView("day"); }}>
                  <div className="dn">{day.getDate()}</div>
                  {list.slice(0, 2).map((a) => (
                    <div key={a.id} className="cal-mev" style={{ background: a.color }}>{m2t(a.start)} {a.patientName.split(" ")[0]}</div>
                  ))}
                  {list.length > 2 && <div className="more">+{list.length - 2}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
