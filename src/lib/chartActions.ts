import { db, type Chart, type ToothState } from "./db";
import {
  PROC_MAP, SURFACE_NAME, TERMINAL,
  type ProcKey, type SurfaceKey, type Status,
} from "./dental";

function emptyTooth(): ToothState {
  return { surfaces: {}, conditions: [] };
}

async function loadChart(patientId: number): Promise<Chart> {
  return (await db.charts.get(patientId)) ?? { patientId, teeth: {} };
}

const newEid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

// ===== الربط التلقائي بالمحاسبة =====
// كل إجراء "مكتمل" بتكلفة يولّد دخلاً تلقائياً في فئة «مراجعين»
async function removeIncomeByEid(eid: string) {
  await db.transactions.filter((t) => t.eid === eid).delete();
}
async function ensureIncome(eid: string) {
  const ev = await db.events.where("eid").equals(eid).first();
  if (!ev) { await removeIncomeByEid(eid); return; }
  const existing = await db.transactions.filter((t) => t.eid === eid).first();
  if (ev.status === "done" && ev.cost > 0) {
    const patient = await db.patients.get(ev.patientId);
    const note = `${patient?.name ?? "مريض"} — ${ev.procName}${ev.surface ? ` (${ev.surface})` : ""}`;
    if (existing) {
      await db.transactions.update(existing.id!, { amount: ev.cost, dateISO: ev.dateISO, note });
    } else {
      await db.transactions.add({
        type: "income", category: "مراجعين", amount: ev.cost, dateISO: ev.dateISO,
        note, patientId: ev.patientId, eid,
      });
    }
  } else if (existing) {
    await removeIncomeByEid(eid);
  }
}

// تطبيق إجراء (يتراكم فوق ما سبق، ويسجَّل في التاريخ بحالته)
export async function applyProcedure(
  patientId: number,
  toothId: number,
  surface: SurfaceKey,
  procKey: ProcKey,
  status: Status,
  cost: number,
) {
  const p = PROC_MAP[procKey];
  const chart = await loadChart(patientId);
  const t = chart.teeth[toothId] ?? emptyTooth();
  const eid = newEid();

  if (p.whole) {
    if (TERMINAL.includes(procKey)) {
      t.conditions = [{ key: procKey, status, eid }];
      t.surfaces = {};
    } else {
      t.conditions = t.conditions.filter((c) => !TERMINAL.includes(c.key));
      const ex = t.conditions.find((c) => c.key === procKey);
      if (ex) { ex.status = status; ex.eid = eid; }
      else t.conditions.push({ key: procKey, status, eid });
    }
  } else {
    t.surfaces[surface] = { key: procKey, status, eid };
  }
  chart.teeth[toothId] = t;

  await db.transaction("rw", db.charts, db.events, async () => {
    await db.charts.put(chart);
    await db.events.add({
      eid, patientId, toothId,
      surface: p.whole ? "" : SURFACE_NAME[surface],
      procKey, procName: p.name, color: p.color,
      status, cost, dateISO: todayISO(), createdAt: Date.now(),
    });
  });
  await ensureIncome(eid);
}

export async function removeCondition(patientId: number, toothId: number, key: ProcKey) {
  const chart = await loadChart(patientId);
  const t = chart.teeth[toothId];
  if (!t) return;
  const c = t.conditions.find((x) => x.key === key);
  t.conditions = t.conditions.filter((x) => x.key !== key);
  await db.transaction("rw", db.charts, db.events, async () => {
    await db.charts.put(chart);
    if (c?.eid) await db.events.where("eid").equals(c.eid).delete();
  });
  if (c?.eid) await removeIncomeByEid(c.eid);
}

export async function removeSurface(patientId: number, toothId: number, sk: SurfaceKey) {
  const chart = await loadChart(patientId);
  const t = chart.teeth[toothId];
  if (!t) return;
  const e = t.surfaces[sk];
  delete t.surfaces[sk];
  await db.transaction("rw", db.charts, db.events, async () => {
    await db.charts.put(chart);
    if (e?.eid) await db.events.where("eid").equals(e.eid).delete();
  });
  if (e?.eid) await removeIncomeByEid(e.eid);
}

export async function convertCondition(patientId: number, toothId: number, key: ProcKey) {
  const chart = await loadChart(patientId);
  const c = chart.teeth[toothId]?.conditions.find((x) => x.key === key);
  if (!c) return;
  c.status = "done";
  await db.transaction("rw", db.charts, db.events, async () => {
    await db.charts.put(chart);
    await db.events.where("eid").equals(c.eid).modify({ status: "done" });
  });
  await ensureIncome(c.eid);
}

export async function convertSurface(patientId: number, toothId: number, sk: SurfaceKey) {
  const chart = await loadChart(patientId);
  const e = chart.teeth[toothId]?.surfaces[sk];
  if (!e) return;
  e.status = "done";
  await db.transaction("rw", db.charts, db.events, async () => {
    await db.charts.put(chart);
    await db.events.where("eid").equals(e.eid).modify({ status: "done" });
  });
  await ensureIncome(e.eid);
}

// حذف حدث من السجل + فك ارتباطه من المخطط
export async function deleteEvent(patientId: number, eid: string) {
  const chart = await loadChart(patientId);
  for (const t of Object.values(chart.teeth)) {
    t.conditions = t.conditions.filter((c) => c.eid !== eid);
    for (const sk of Object.keys(t.surfaces) as SurfaceKey[]) {
      if (t.surfaces[sk]?.eid === eid) delete t.surfaces[sk];
    }
  }
  await db.transaction("rw", db.charts, db.events, async () => {
    await db.charts.put(chart);
    await db.events.where("eid").equals(eid).delete();
  });
  await removeIncomeByEid(eid);
}
