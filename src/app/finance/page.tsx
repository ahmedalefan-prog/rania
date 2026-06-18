"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { TrendingUp, TrendingDown, Wallet, Percent, Plus, FileText } from "lucide-react";
import { db, type Transaction } from "@/lib/db";
import { useSettings } from "@/components/Providers";
import { useUI } from "@/components/ui";
import { ymd, addDays, startOfWeek } from "@/lib/appt";

type ChartMode = "week" | "month" | "half" | "year";

const INCOME_CATS = ["مراجعين", "أخرى"];
const EXPENSE_CATS = ["راتب", "إيجار", "كهرباء", "مشتريات", "صيانة", "أخرى"];
const CAT_COLORS: Record<string, string> = {
  "مراجعين": "#16a34a", "علاج": "#16a34a", "راتب": "#2563eb", "إيجار": "#9333ea",
  "كهرباء": "#eab308", "مشتريات": "#06b6d4", "صيانة": "#f59e0b", "أخرى": "#6b7280",
};
const catColor = (c: string) => CAT_COLORS[c] ?? "#6b7280";
const pad = (n: number) => String(n).padStart(2, "0");

type Period = "month" | "lastmonth" | "year" | "all" | string; // أو "YYYY-MM"

export default function FinancePage() {
  const { settings } = useSettings();
  const { toast, confirm } = useUI();
  const cur = settings.currency;
  const txns = useLiveQuery(() => db.transactions.orderBy("dateISO").reverse().toArray(), []) ?? [];

  const [period, setPeriod] = useState<Period>("month");
  const [chartMode, setChartMode] = useState<ChartMode>("month");
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<Transaction["type"]>("income");
  const [category, setCategory] = useState("علاج");
  const [amount, setAmount] = useState("");
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);

  const now = new Date();
  const curMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lm.getFullYear()}-${pad(lm.getMonth() + 1)}`;

  const matches = (t: Transaction) => {
    if (period === "all") return true;
    if (period === "month") return t.dateISO.startsWith(curMonth);
    if (period === "lastmonth") return t.dateISO.startsWith(lastMonth);
    if (period === "year") return t.dateISO.startsWith(String(now.getFullYear()));
    return t.dateISO.startsWith(period); // YYYY-MM محدد
  };
  const view = txns.filter(matches);

  const income = view.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = view.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  const margin = income > 0 ? Math.round((net / income) * 100) : null;

  // بناء فترات الرسم البياني حسب الوضع المختار
  const sumRange = (s: string, e: string, kind: Transaction["type"]) =>
    txns.filter((t) => t.type === kind && t.dateISO >= s && t.dateISO <= e).reduce((sum, t) => sum + t.amount, 0);

  const ranges: { label: string; s: string; e: string }[] = [];
  if (chartMode === "week") {
    const ws = startOfWeek(now);
    for (let i = 7; i >= 0; i--) {
      const s = addDays(ws, -i * 7);
      ranges.push({ label: s.toLocaleDateString("ar", { day: "numeric", month: "short" }), s: ymd(s), e: ymd(addDays(s, 6)) });
    }
  } else if (chartMode === "month") {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      ranges.push({ label: d.toLocaleDateString("ar", { month: "short" }), s: ymd(d), e: ymd(e) });
    }
  } else if (chartMode === "half") {
    let y = now.getFullYear(), h = now.getMonth() < 6 ? 0 : 1;
    const hs: { y: number; h: number }[] = [];
    for (let i = 0; i < 4; i++) { hs.unshift({ y, h }); if (h === 0) { h = 1; y--; } else h = 0; }
    hs.forEach(({ y, h }) => ranges.push({
      label: `${h === 0 ? "ن١" : "ن٢"} ${y}`,
      s: h === 0 ? `${y}-01-01` : `${y}-07-01`, e: h === 0 ? `${y}-06-30` : `${y}-12-31`,
    }));
  } else {
    for (let i = 4; i >= 0; i--) { const y = now.getFullYear() - i; ranges.push({ label: String(y), s: `${y}-01-01`, e: `${y}-12-31` }); }
  }
  const chartData = ranges.map((r) => ({ ...r, income: sumRange(r.s, r.e, "income"), expense: sumRange(r.s, r.e, "expense") }));
  const chartMax = Math.max(1, ...chartData.flatMap((m) => [m.income, m.expense]));
  const CHART_MODES: [ChartMode, string][] = [["week", "أسبوعي"], ["month", "شهري"], ["half", "نصف سنوي"], ["year", "سنوي"]];

  const breakdown = (kind: Transaction["type"]) => {
    const m: Record<string, number> = {};
    view.filter((t) => t.type === kind).forEach((t) => { m[t.category] = (m[t.category] ?? 0) + t.amount; });
    const total = Object.values(m).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ c, v, pct: Math.round((v / total) * 100) }));
  };
  const expBreak = breakdown("expense");
  const incBreak = breakdown("income");

  const months = Array.from(new Set(txns.map((t) => t.dateISO.slice(0, 7)))).sort().reverse();
  const amtNum = Number(amount);
  const amtError = touched && (!amount || isNaN(amtNum) || amtNum <= 0) ? "أدخل مبلغاً صحيحاً" : "";
  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;

  async function add() {
    setTouched(true);
    if (!amount || isNaN(amtNum) || amtNum <= 0) return;
    await db.transactions.add({ type, category, amount: amtNum, dateISO, note });
    setAmount(""); setNote(""); setTouched(false); setAdding(false);
    toast("تم حفظ الحركة");
  }
  async function remove(t: Transaction) {
    const ok = await confirm({ title: "حذف هذه الحركة؟", confirmText: "حذف", danger: true });
    if (ok) { await db.transactions.delete(t.id!); toast("تم الحذف", "info"); }
  }

  const periodLabel =
    period === "all" ? "كل الفترات" : period === "month" ? "الشهر الحالي"
    : period === "lastmonth" ? "الشهر الماضي" : period === "year" ? `سنة ${now.getFullYear()}` : period;

  function printReport() {
    const money = (n: number) => `${n.toLocaleString()} ${cur}`;
    const txRows = view.map((t) =>
      `<tr><td>${t.dateISO}</td><td>${t.type === "income" ? "إيراد" : "مصروف"}</td><td>${t.category}</td><td>${t.note ?? ""}</td><td style="text-align:left;color:${t.type === "income" ? "#16a34a" : "#dc2626"}">${t.type === "income" ? "+" : "−"}${money(t.amount)}</td></tr>`).join("");
    const brkRows = (arr: typeof expBreak) => arr.map((r) => `<tr><td>${r.c}</td><td style="text-align:left">${money(r.v)} (${r.pct}%)</td></tr>`).join("") || `<tr><td colspan="2">لا يوجد</td></tr>`;
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير مالي</title>
<style>
 body{font-family:'Segoe UI',Tahoma,Arial;padding:26px;color:#0f2e2a}
 .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0d9488;padding-bottom:10px}
 h1{font-size:20px;margin:0;color:#0d9488} h2{font-size:14px;margin:20px 0 8px;color:#0d9488}
 .muted{color:#64748b;font-size:12px}
 .kpis{display:flex;gap:10px;margin:16px 0}
 .kpi{flex:1;border:1px solid #cdeee8;border-radius:10px;padding:12px;text-align:center;background:#f0fdfa}
 .kpi .v{font-size:18px;font-weight:bold} .kpi .k{font-size:11px;color:#64748b;margin-top:3px}
 table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:6px}
 th,td{border:1px solid #e2e8f0;padding:6px 9px;text-align:right} th{background:#ecfdfa;color:#0d9488}
 tfoot td{font-weight:bold;background:#f8fafc}
 @media print{.noprint{display:none}}
</style></head><body>
 <div class="head"><div><h1>${settings.clinicName}</h1><div class="muted">تقرير مالي — ${periodLabel}</div></div>
 <div class="muted">تاريخ الإصدار: ${new Date().toLocaleDateString("ar")}</div></div>
 <div class="kpis">
  <div class="kpi"><div class="v" style="color:#16a34a">${money(income)}</div><div class="k">الإيرادات</div></div>
  <div class="kpi"><div class="v" style="color:#dc2626">${money(expense)}</div><div class="k">المصاريف</div></div>
  <div class="kpi"><div class="v">${money(net)}</div><div class="k">الصافي</div></div>
  <div class="kpi"><div class="v">${margin == null ? "—" : margin + "%"}</div><div class="k">هامش الربح</div></div>
 </div>
 <h2>الإيرادات حسب الفئة</h2><table><tbody>${brkRows(incBreak)}</tbody></table>
 <h2>المصاريف حسب الفئة</h2><table><tbody>${brkRows(expBreak)}</tbody></table>
 <h2>سجل الحركات (${view.length})</h2>
 <table><thead><tr><th>التاريخ</th><th>النوع</th><th>الفئة</th><th>ملاحظة</th><th>المبلغ</th></tr></thead>
 <tbody>${txRows || '<tr><td colspan="5">لا حركات</td></tr>'}</tbody>
 <tfoot><tr><td colspan="4">الصافي</td><td style="text-align:left">${money(net)}</td></tr></tfoot></table>
 <p class="muted" style="margin-top:26px;text-align:center">— تطبيق إدارة عيادة د. رانيا —</p>
 <div class="noprint" style="text-align:center;margin-top:14px"><button onclick="window.print()" style="padding:11px 22px;border:none;border-radius:8px;background:#0d9488;color:#fff;font-size:14px;cursor:pointer">🖨 طباعة / حفظ PDF</button></div>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast("اسمح بالنوافذ المنبثقة لعرض التقرير", "error"); return; }
    w.document.write(html);
    w.document.close();
  }

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div><h2 className="page-title">المحاسبة</h2><p className="page-sub">لوحة مالية — {periodLabel}</p></div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost stat-ic" onClick={printReport}><FileText size={16} /> تقرير مالي</button>
          <button className="btn stat-ic" onClick={() => setAdding((v) => !v)}>
            <Plus size={16} /> {adding ? "إغلاق" : "حركة جديدة"}
          </button>
        </div>
      </div>

      {adding && (
        <div className="card">
          <div className="toggle" style={{ marginBottom: 12, width: "fit-content" }}>
            <button className={type === "income" ? "active" : ""} onClick={() => { setType("income"); setCategory(INCOME_CATS[0]); }}>إيراد</button>
            <button className={type === "expense" ? "active" : ""} onClick={() => { setType("expense"); setCategory(EXPENSE_CATS[0]); }}>مصروف</button>
          </div>
          <div className="grid2">
            <div className="field"><label>الفئة</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div className="field"><label>المبلغ ({cur}) *</label>
              <input className={amtError ? "invalid" : ""} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              {amtError && <div className="err">{amtError}</div>}
            </div>
            <div className="field"><label>التاريخ</label>
              <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} /></div>
            <div className="field"><label>ملاحظة</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </div>
          <button className="btn" onClick={add}>حفظ الحركة</button>
        </div>
      )}

      {/* فلاتر الفترة */}
      <div className="toolbar-row">
        {([["month", "هذا الشهر"], ["lastmonth", "الشهر الماضي"], ["year", "السنة"], ["all", "الكل"]] as [Period, string][]).map(([k, l]) => (
          <button key={k} className={`chiptab ${period === k ? "active" : ""}`} onClick={() => setPeriod(k)}>{l}</button>
        ))}
        <select className="select-sm right" value={typeof period === "string" && period.includes("-") ? period : ""}
          onChange={(e) => e.target.value && setPeriod(e.target.value)}>
          <option value="">شهر محدد…</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* المؤشرات */}
      <div className="fin-kpis">
        <div className="kpi-card"><TrendingUp className="ic" size={42} color="var(--good)" />
          <div className="v" style={{ color: "var(--good)" }}>{income.toLocaleString()} {cur}</div><div className="k">الإيرادات</div></div>
        <div className="kpi-card"><TrendingDown className="ic" size={42} color="var(--danger)" />
          <div className="v" style={{ color: "var(--danger)" }}>{expense.toLocaleString()} {cur}</div><div className="k">المصاريف</div></div>
        <div className="kpi-card"><Wallet className="ic" size={42} color="var(--accent)" />
          <div className="v" style={{ color: net >= 0 ? "var(--good)" : "var(--danger)" }}>{net.toLocaleString()} {cur}</div><div className="k">الصافي</div></div>
        <div className="kpi-card"><Percent className="ic" size={42} color="var(--accent)" />
          <div className="v">{margin == null ? "—" : `${margin}%`}</div><div className="k">هامش الربح</div></div>
      </div>

      {/* الرسم البياني */}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <h4 className="sec-title" style={{ margin: 0 }}>الإيرادات والمصاريف</h4>
          <div className="seg" style={{ marginInlineStart: 0 }}>
            {CHART_MODES.map(([m, l]) => (
              <button key={m} className={chartMode === m ? "active" : ""} onClick={() => setChartMode(m)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="chart-legend" style={{ marginTop: 12 }}>
          <span><span className="d" style={{ background: "var(--good)" }} />إيرادات</span>
          <span><span className="d" style={{ background: "var(--danger)" }} />مصاريف</span>
        </div>
        <div className="bars">
          {chartData.map((m, i) => (
            <div key={i} className="bar-col">
              <div className="bar-pair">
                <div className="bar" style={{ height: `${(m.income / chartMax) * 100}%`, background: "var(--good)" }} title={`إيراد: ${m.income}`} />
                <div className="bar" style={{ height: `${(m.expense / chartMax) * 100}%`, background: "var(--danger)" }} title={`مصروف: ${m.expense}`} />
              </div>
              <div className="bar-label">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* التحليل حسب الفئة */}
      <div className="grid2">
        <div className="card">
          <h4 className="sec-title">المصاريف حسب الفئة</h4>
          {expBreak.length === 0 ? <div className="empty">لا مصاريف.</div> : expBreak.map((r) => (
            <div key={r.c} className="brk-row">
              <span className="nm"><span className="cat-dot" style={{ background: catColor(r.c) }} />{r.c}</span>
              <span className="brk-bar"><span style={{ width: `${r.pct}%`, background: catColor(r.c) }} /></span>
              <span className="amt">{r.v.toLocaleString()} {cur} ({r.pct}%)</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h4 className="sec-title">الإيرادات حسب الفئة</h4>
          {incBreak.length === 0 ? <div className="empty">لا إيرادات.</div> : incBreak.map((r) => (
            <div key={r.c} className="brk-row">
              <span className="nm"><span className="cat-dot" style={{ background: catColor(r.c) }} />{r.c}</span>
              <span className="brk-bar"><span style={{ width: `${r.pct}%`, background: catColor(r.c) }} /></span>
              <span className="amt">{r.v.toLocaleString()} {cur} ({r.pct}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* السجل */}
      <div className="card">
        <h4 className="sec-title">سجل الحركات ({view.length})</h4>
        {view.length === 0 ? (
          <div className="empty">لا حركات في هذه الفترة.</div>
        ) : (
          view.map((t) => (
            <div key={t.id} className="tl-item">
              <span className="dot" style={{ background: catColor(t.category) }} />
              <div className="info">
                <div className="t1">{t.category} {t.note ? <span className="muted">— {t.note}</span> : ""}</div>
                <div className="t2">{t.dateISO} • {t.type === "income" ? "إيراد" : "مصروف"}</div>
              </div>
              <span className="cost" style={{ color: t.type === "income" ? "var(--good)" : "var(--danger)" }}>
                {t.type === "income" ? "+" : "−"}{t.amount.toLocaleString()} {cur}
              </span>
              <button className="del" onClick={() => remove(t)}>×</button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
