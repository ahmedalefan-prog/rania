"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useSettings } from "./Providers";
import { toothSvg } from "@/lib/toothSvg";
import {
  ADULT, CHILD, PROCEDURES, SURFACES, SURFACE_NAME, PROC_MAP, ABBR, SOUND, pcol,
  type SurfaceKey, type ProcKey, type Status,
} from "@/lib/dental";
import {
  applyProcedure, removeCondition, removeSurface,
  convertCondition, convertSurface,
} from "@/lib/chartActions";

export function Odontogram({ patientId }: { patientId: number }) {
  const { settings } = useSettings();
  const chart = useLiveQuery(() => db.charts.get(patientId), [patientId]);
  const [setName, setSetName] = useState<"adult" | "child">("adult");
  const [tooth, setTooth] = useState<number | null>(null);
  const [surface, setSurface] = useState<SurfaceKey>("O");
  const [status, setStatus] = useState<Status>("done");

  const teeth = chart?.teeth ?? {};
  const set = setName === "adult" ? ADULT : CHILD;
  const jaw = setName === "adult" ? "" : "اللبني ";

  function openTooth(id: number, ev: React.MouseEvent) {
    const el = (ev.target as Element).closest(".surf");
    const s = (el?.getAttribute("data-s") as SurfaceKey) || "O";
    setTooth(id);
    setSurface(s);
    setStatus("done");
  }

  const Arch = ({ list, cls }: { list: number[]; cls: string }) => (
    <div className={`arch ${cls}`}>
      {list.map((id) => {
        const t = teeth[id];
        const conds = t?.conditions ?? [];
        const flagged = conds.length > 0 || Object.keys(t?.surfaces ?? {}).length > 0;
        return (
          <div key={id} className={`tooth ${flagged ? "flagged" : ""}`} onClick={(e) => openTooth(id, e)}>
            <span dangerouslySetInnerHTML={{ __html: toothSvg(id, t, settings.toothStyle) }} />
            <div className="num">{id}</div>
            <div className="chips">
              {conds.map((c) => {
                const planned = c.status === "planned";
                const st = planned
                  ? { color: pcol(c.key), borderColor: pcol(c.key) }
                  : { background: pcol(c.key) };
                return (
                  <span key={c.key} className={`chip ${planned ? "planned" : ""}`} style={st}>
                    {ABBR[c.key] ?? "•"}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const activeTooth = tooth != null ? teeth[tooth] : undefined;

  return (
    <>
      <div className="chart-controls">
        <div className="toggle">
          <button className={setName === "adult" ? "active" : ""} onClick={() => setSetName("adult")}>
            أسنان البالغين (32)
          </button>
          <button className={setName === "child" ? "active" : ""} onClick={() => setSetName("child")}>
            أسنان الأطفال (20)
          </button>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>اضغط على أي سطح من السن</div>
      </div>

      <div className="chart-wrap">
        <div className="quad-labels"><span>الفك {jaw}العلوي الأيمن ◄</span><span>► الأيسر</span></div>
        <Arch list={set.upper} cls="upper" />
        <Arch list={set.lower} cls="lower" />
        <div className="quad-labels"><span>الفك {jaw}السفلي الأيمن ◄</span><span>► الأيسر</span></div>
      </div>

      <Legend />

      {/* Sheet */}
      <div className={`overlay ${tooth != null ? "show" : ""}`} onClick={(e) => {
        if ((e.target as Element).classList.contains("overlay")) setTooth(null);
      }}>
        {tooth != null && (
          <div className="sheet">
            <h3>السن رقم {tooth}</h3>
            <div className="hint">اختر الحالة ثم السطح ثم الإجراء — الإجراءات تتراكم ولا تُلغي بعضها</div>

            <CurrentState
              patientId={patientId} toothId={tooth} t={activeTooth}
            />

            <div className="status-pick">
              <button className={`stDone ${status === "done" ? "active" : ""}`} onClick={() => setStatus("done")}>
                ✓ مكتمل (تم تنفيذه)
              </button>
              <button className={`stPlan ${status === "planned" ? "active" : ""}`} onClick={() => setStatus("planned")}>
                ◇ مقترح (خطة علاج)
              </button>
            </div>

            <div className="surf-pick">
              {SURFACES.map((s) => (
                <button key={s.key} className={surface === s.key ? "active" : ""} onClick={() => setSurface(s.key)}>
                  {s.name}<br /><span style={{ fontSize: 9, opacity: 0.6 }}>{s.label}</span>
                </button>
              ))}
            </div>

            <div className="proc-grid">
              {PROCEDURES.map((p) => {
                const price = settings.prices?.[p.key] ?? p.cost;
                return (
                  <div key={p.key} className="proc"
                    onClick={() => applyProcedure(patientId, tooth, surface, p.key, status, price)}>
                    <span className="dot" style={{ background: p.color }} />
                    {p.name}
                    <span className="cost">{price > 0 ? `${price} ${settings.currency}` : ""}</span>
                  </div>
                );
              })}
            </div>

            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={() => setTooth(null)}>إغلاق</button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  function CurrentState({ patientId, toothId, t }: { patientId: number; toothId: number; t?: typeof activeTooth }) {
    const conds = t?.conditions ?? [];
    const surfs = t?.surfaces ?? {};
    const rows: React.ReactNode[] = [];
    conds.forEach((c) => {
      const p = PROC_MAP[c.key]; const planned = c.status === "planned";
      rows.push(
        <div key={`c-${c.key}`} className={`cs ${planned ? "planned" : ""}`}>
          <span className="dot" style={{ background: p.color, opacity: planned ? 0.55 : 1 }} />
          {p.name} <span className="cs-meta">(كامل السن • {planned ? "مقترح ◇" : "مكتمل ✓"})</span>
          <span className="cs-actions">
            {planned && <button className="todone" onClick={() => convertCondition(patientId, toothId, c.key)}>✓ تم تنفيذه</button>}
            <button className="rm" onClick={() => removeCondition(patientId, toothId, c.key)}>إزالة</button>
          </span>
        </div>,
      );
    });
    (Object.keys(surfs) as SurfaceKey[]).forEach((sk) => {
      const e = surfs[sk]!; const p = PROC_MAP[e.key]; const planned = e.status === "planned";
      rows.push(
        <div key={`s-${sk}`} className={`cs ${planned ? "planned" : ""}`}>
          <span className="dot" style={{ background: p.color, opacity: planned ? 0.55 : 1 }} />
          {p.name} <span className="cs-meta">({SURFACE_NAME[sk]} • {planned ? "مقترح ◇" : "مكتمل ✓"})</span>
          <span className="cs-actions">
            {planned && <button className="todone" onClick={() => convertSurface(patientId, toothId, sk)}>✓ تم تنفيذه</button>}
            <button className="rm" onClick={() => removeSurface(patientId, toothId, sk)}>إزالة</button>
          </span>
        </div>,
      );
    });
    if (!rows.length) return null;
    return (
      <div style={{ marginBottom: 14 }}>
        <div className="cs-title">الحالة الحالية لهذا السن ({rows.length}):</div>
        {rows}
      </div>
    );
  }
}

function Legend() {
  return (
    <div className="legend">
      <div className="item" style={{ width: "100%", color: "var(--text)" }}>
        <span className="dot" style={{ background: "#38bdf8" }} />صلب = مكتمل&nbsp;&nbsp;
        <span className="dot" style={{ background: "transparent", border: "1.5px dashed #f59e0b" }} />متقطّع = مقترح
      </div>
      <div className="item"><span className="dot" style={{ background: SOUND }} />سليم</div>
      {PROCEDURES.filter((p) => p.key !== "exam" && p.key !== "other").map((p) => (
        <div key={p.key} className="item"><span className="dot" style={{ background: p.color }} />{p.name}</div>
      ))}
    </div>
  );
}
