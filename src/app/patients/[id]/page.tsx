"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, User, HeartPulse, FileText } from "lucide-react";
import { db, type Patient, type Attachment } from "@/lib/db";
import { useSettings } from "@/components/Providers";
import { useUI } from "@/components/ui";
import { Odontogram } from "@/components/Odontogram";
import { Attachments } from "@/components/Attachments";
import { deleteEvent } from "@/lib/chartActions";
import { displayAge, medicalAlerts, GENDER_LABEL } from "@/lib/patient";
import { toothSvg } from "@/lib/toothSvg";
import { ADULT, CHILD, PROCEDURES, PROC_MAP, pcol } from "@/lib/dental";

type Tab = "profile" | "chart" | "media" | "timeline";

const KIND_LABEL: Record<Attachment["kind"], string> = { photo: "صورة", xray: "أشعة" };

export default function PatientPage() {
  const { settings } = useSettings();
  const { toast, confirm } = useUI();
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [tab, setTab] = useState<Tab>("profile");
  const [pickReport, setPickReport] = useState(false);
  const [chosen, setChosen] = useState<Set<number>>(new Set());

  const patient = useLiveQuery(() => db.patients.get(id), [id]);
  const events = useLiveQuery(() => db.events.where("patientId").equals(id).toArray(), [id]);
  const attachments = useLiveQuery(() => db.attachments.where("patientId").equals(id).toArray(), [id]);

  const cur = settings.currency;
  const done = (events ?? []).filter((e) => e.status === "done").reduce((s, e) => s + (e.cost || 0), 0);
  const plan = (events ?? []).filter((e) => e.status === "planned").reduce((s, e) => s + (e.cost || 0), 0);

  async function removeEvent(eid: string) {
    const ok = await confirm({ title: "حذف هذا الإجراء من السجل؟", confirmText: "حذف", danger: true });
    if (ok) { await deleteEvent(id, eid); toast("تم حذف الإجراء", "info"); }
  }

  function openReport() {
    if ((attachments ?? []).length > 0) {
      setChosen(new Set());
      setPickReport(true);
    } else {
      printPatientReport([]);
    }
  }

  async function printPatientReport(selected: Attachment[]) {
    if (!patient) return;
    const w = window.open("", "_blank");
    if (!w) { toast("اسمح بالنوافذ المنبثقة لعرض التقرير", "error"); return; }
    const chart = await db.charts.get(id);
    const teeth = chart?.teeth ?? {};
    const cur = settings.currency;
    const alerts = medicalAlerts(patient);
    const age = displayAge(patient);
    const evs = [...(events ?? [])].sort((a, b) => a.createdAt - b.createdAt);
    const money = (n: number) => `${n.toLocaleString()} ${cur}`;
    const info = [
      ["الاسم", patient.name], ["رقم الملف", patient.fileNo || "—"],
      ["الجنس", GENDER_LABEL[patient.gender ?? ""] || "—"], ["العمر", age ? `${age} سنة` : "—"],
      ["الهاتف", patient.phone || "—"],
    ].map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("");
    const med = [
      ["الحساسية", patient.allergy], ["الأمراض المزمنة", patient.chronic], ["الأدوية", patient.medications],
    ].filter(([, v]) => v).map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("");
    const flags = [patient.smoker && "مدخّن", patient.bloodThinner && "مميّع للدم", patient.pregnant && "حامل"].filter(Boolean).join("، ");
    const evRows = evs.map((e) =>
      `<tr><td>${e.dateISO}</td><td>${e.toothId}</td><td>${PROC_MAP[e.procKey]?.name ?? e.procName}${e.surface ? ` (${e.surface})` : ""}</td><td>${e.status === "done" ? "مكتمل" : "مقترح"}</td><td style="text-align:left">${e.cost > 0 ? money(e.cost) : "—"}</td></tr>`).join("");
    const alertHtml = alerts.length
      ? `<div class="alert"><b>⚠️ تنبيه طبي:</b> ${alerts.map((a) => a.label).join(" • ")}</div>` : "";

    // مخطط الفكين التشريحي مع تلوين الأسنان المعالَجة
    const flag = (tid: number) => {
      const t = teeth[tid];
      return !!t && (((t.conditions?.length ?? 0) > 0) || Object.keys(t.surfaces ?? {}).length > 0);
    };
    const archHtml = (ids: number[]) => `<div class="arch">` +
      ids.map((tid) => `<div class="rtooth ${flag(tid) ? "flag" : ""}">${toothSvg(tid, teeth[tid], "anat")}<div class="rnum">${tid}</div></div>`).join("") + `</div>`;
    const hasChild = [...CHILD.upper, ...CHILD.lower].some((tid) => teeth[tid]);
    const chartHtml = `
      <div class="jaw"><div class="jaw-label">الفك العلوي</div>${archHtml(ADULT.upper)}</div>
      <div class="jaw"><div class="jaw-label">الفك السفلي</div>${archHtml(ADULT.lower)}</div>
      ${hasChild ? `<div class="jaw"><div class="jaw-label">أسنان لبنية — الفك العلوي</div>${archHtml(CHILD.upper)}</div><div class="jaw"><div class="jaw-label">أسنان لبنية — الفك السفلي</div>${archHtml(CHILD.lower)}</div>` : ""}
      <div class="rlegend">${PROCEDURES.filter((p) => p.key !== "exam" && p.key !== "other").map((p) => `<span><span class="d" style="background:${p.color}"></span>${p.name}</span>`).join("")}</div>`;

    // الصور والأشعة المختارة من المستخدم
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    const mediaHtml = selected.length
      ? `<h2>الصور والأشعة (${selected.length})</h2><div class="media">` +
        selected.map((a) => `<figure class="mfig"><img src="${a.data}"><figcaption>${KIND_LABEL[a.kind]}${a.name ? ` — ${esc(a.name)}` : ""} • ${a.dateISO}</figcaption></figure>`).join("") +
        `</div>` : "";

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير المريض</title>
<style>
 body{font-family:'Segoe UI',Tahoma,Arial;padding:26px;color:#0f2e2a}
 .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0d9488;padding-bottom:10px}
 h1{font-size:20px;margin:0;color:#0d9488} h2{font-size:14px;margin:18px 0 8px;color:#0d9488}
 .muted{color:#64748b;font-size:12px}
 .alert{background:#fee2e2;border:1px solid #ef4444;color:#b91c1c;border-radius:8px;padding:9px 12px;margin:14px 0;font-size:13px}
 table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:6px}
 th,td{border:1px solid #e2e8f0;padding:6px 9px;text-align:right} th{background:#ecfdfa;color:#0d9488;white-space:nowrap}
 .info-table th{width:120px}
 .bal{display:flex;gap:10px;margin:10px 0}
 .bal .b{flex:1;border:1px solid #cdeee8;border-radius:10px;padding:11px;text-align:center;background:#f0fdfa}
 .bal .v{font-size:17px;font-weight:bold} .bal .k{font-size:11px;color:#64748b}
 .jaw{margin:8px 0}
 .jaw-label{font-size:11px;color:#64748b;margin-bottom:3px}
 .arch{display:flex;justify-content:center;gap:3px;direction:ltr;flex-wrap:nowrap}
 .arch svg{width:30px;height:auto}
 .rtooth{display:flex;flex-direction:column;align-items:center}
 .rtooth .rnum{font-size:8px;color:#94a3b8;margin-top:1px}
 .rtooth.flag .rnum{color:#0d9488;font-weight:bold}
 .surf{stroke:#cbd5e1;stroke-width:1}
 .rlegend{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:10px;font-size:11px;color:#475569}
 .rlegend .d{width:10px;height:10px;border-radius:3px;display:inline-block;margin-inline-end:4px;vertical-align:-1px}
 .media{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 .mfig{margin:0;border:1px solid #e2e8f0;border-radius:8px;padding:6px;background:#f8fafc;page-break-inside:avoid}
 .mfig img{width:100%;height:auto;border-radius:5px;display:block}
 .mfig figcaption{font-size:11px;color:#475569;margin-top:5px;text-align:center}
 @media print{.noprint{display:none}}
</style></head><body>
 <div class="head"><div><h1>${settings.clinicName}</h1><div class="muted">تقرير المريض</div></div>
 <div class="muted">تاريخ الإصدار: ${new Date().toLocaleDateString("ar")}</div></div>
 ${alertHtml}
 <h2>المعلومات الشخصية</h2>
 <table class="info-table"><tbody>${info}</tbody></table>
 ${med || flags ? `<h2>التاريخ الطبي</h2><table><tbody>${med}${flags ? `<tr><th>مؤشرات</th><td>${flags}</td></tr>` : ""}</tbody></table>` : ""}
 <h2>الحساب</h2>
 <div class="bal">
   <div class="b"><div class="v" style="color:#16a34a">${money(done)}</div><div class="k">المُنفَّذ (مستحق)</div></div>
   <div class="b"><div class="v" style="color:#f59e0b">${money(plan)}</div><div class="k">الخطة المقترحة (تقدير)</div></div>
 </div>
 <h2>مخطط الأسنان</h2>
 ${chartHtml}
 <h2>سجل الإجراءات (${evs.length})</h2>
 <table><thead><tr><th>التاريخ</th><th>السن</th><th>الإجراء</th><th>الحالة</th><th>التكلفة</th></tr></thead>
 <tbody>${evRows || '<tr><td colspan="5">لا إجراءات</td></tr>'}</tbody></table>
 ${mediaHtml}
 <p class="muted" style="margin-top:26px;text-align:center">— تطبيق إدارة عيادة د. رانيا —</p>
 <div class="noprint" style="text-align:center;margin-top:14px"><button onclick="window.print()" style="padding:11px 22px;border:none;border-radius:8px;background:#0d9488;color:#fff;font-size:14px;cursor:pointer">🖨 طباعة / حفظ PDF</button></div>
</body></html>`;
    w.document.write(html);
    w.document.close();
  }

  if (patient === undefined) return <div className="empty">جارٍ التحميل…</div>;
  if (patient === null) return <div className="empty">المريض غير موجود.</div>;

  const alerts = medicalAlerts(patient);
  const age = displayAge(patient);
  const sub = [age ? `${age} سنة` : "", GENDER_LABEL[patient.gender ?? ""], patient.phone,
    patient.fileNo ? `ملف #${patient.fileNo}` : ""].filter(Boolean).join(" • ");

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <div className="avatar">{patient.name.trim().charAt(0)}</div>
          <div>
            <h2 className="page-title" style={{ marginBottom: 0 }}>{patient.name}</h2>
            <p className="page-sub" style={{ margin: 0 }}>{sub || "—"}</p>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost stat-ic" onClick={openReport}><FileText size={16} /> تقرير المريض</button>
          <button className="btn btn-ghost" onClick={() => router.push("/patients")}>‹ رجوع</button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="med-alert">
          <AlertTriangle size={18} style={{ color: "#f87171", flexShrink: 0, marginTop: 2 }} />
          <div className="ma-list">
            <b>تنبيه طبي:</b>
            {alerts.map((a, i) => <span key={i} className={`achip ${a.level}`}>{a.label}</span>)}
          </div>
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>الملف الشخصي</button>
        <button className={`tab ${tab === "chart" ? "active" : ""}`} onClick={() => setTab("chart")}>مخطط الأسنان</button>
        <button className={`tab ${tab === "media" ? "active" : ""}`} onClick={() => setTab("media")}>الصور والأشعة</button>
        <button className={`tab ${tab === "timeline" ? "active" : ""}`} onClick={() => setTab("timeline")}>السجل الزمني</button>
      </div>

      {tab === "profile" && <ProfileTab patient={patient} done={done} plan={plan} cur={cur} />}

      {tab === "chart" && <div className="card"><Odontogram patientId={id} /></div>}

      {tab === "media" && <Attachments patientId={id} />}

      {tab === "timeline" && (
        <div className="card">
          {(events ?? []).length === 0 ? (
            <div className="empty">لا توجد إجراءات بعد. افتح مخطط الأسنان وابدأ التسجيل.</div>
          ) : (
            [...(events ?? [])].sort((a, b) => b.createdAt - a.createdAt).map((e) => {
              const planned = e.status === "planned";
              return (
                <div key={e.id} className={`tl-item ${planned ? "planned" : ""}`}>
                  <span className="dot" style={{ background: pcol(e.procKey), opacity: planned ? 0.55 : 1 }} />
                  <div className="info">
                    <div className="t1">
                      {PROC_MAP[e.procKey]?.name ?? e.procName} {e.surface ? `(${e.surface})` : ""}
                      <span className={planned ? "badge-plan" : "badge-done"}>{planned ? "مقترح" : "مكتمل"}</span>
                    </div>
                    <div className="t2">السن {e.toothId} • {e.dateISO}</div>
                  </div>
                  <span className="cost">{e.cost > 0 ? `${e.cost} ${cur}` : "—"}</span>
                  <button className="del" onClick={() => removeEvent(e.eid)}>×</button>
                </div>
              );
            })
          )}
        </div>
      )}

      {pickReport && (
        <div className="overlay center show" onClick={(e) => { if ((e.target as Element).classList.contains("overlay")) setPickReport(false); }}>
          <div className="sheet" style={{ maxWidth: 560, borderRadius: 18 }}>
            <h3>إرفاق صور بالتقرير</h3>
            <p className="hint">اختر الصور والأشعة التي تريد تضمينها في تقرير المريض.</p>
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              <button className="btn btn-ghost" onClick={() => setChosen(new Set((attachments ?? []).map((a) => a.id!)))}>تحديد الكل</button>
              <button className="btn btn-ghost" onClick={() => setChosen(new Set())}>إلغاء التحديد</button>
            </div>
            <div className="media-grid">
              {[...(attachments ?? [])].sort((a, b) => b.createdAt - a.createdAt).map((a) => {
                const on = chosen.has(a.id!);
                return (
                  <button key={a.id} className={`pick-card ${on ? "on" : ""}`}
                    onClick={() => setChosen((prev) => { const n = new Set(prev); if (on) n.delete(a.id!); else n.add(a.id!); return n; })}>
                    <img src={a.data} alt={a.name || KIND_LABEL[a.kind]} />
                    <span className={`att-badge ${a.kind}`}>{KIND_LABEL[a.kind]}</span>
                    {on && <span className="pick-tick">✓</span>}
                    {a.name && <span className="pick-name">{a.name}</span>}
                  </button>
                );
              })}
            </div>
            <div className="sheet-actions">
              <button className="btn stat-ic" onClick={() => {
                const sel = (attachments ?? []).filter((a) => chosen.has(a.id!));
                setPickReport(false);
                printPatientReport(sel);
              }}><FileText size={16} /> إنشاء التقرير ({chosen.size})</button>
              <button className="btn btn-ghost" onClick={() => { setPickReport(false); printPatientReport([]); }}>بدون صور</button>
              <button className="btn btn-ghost" onClick={() => setPickReport(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProfileTab({ patient, done, plan, cur }: { patient: Patient; done: number; plan: number; cur: string }) {
  const id = patient.id!;
  const upd = (patch: Partial<Patient>) => db.patients.update(id, patch);
  const age = displayAge(patient);

  return (
    <>
      <div className="card">
        <h4 className="sec-title"><span className="stat-ic"><User size={16} /> معلومات شخصية</span></h4>
        <div className="grid2">
          <Inp label="الاسم" v={patient.name} on={(v) => upd({ name: v })} />
          <Inp label="رقم الملف" v={patient.fileNo} on={(v) => upd({ fileNo: v })} />
          <Sel label="الجنس" v={patient.gender ?? ""} on={(v) => upd({ gender: v as Patient["gender"] })}
            opts={[["", "—"], ["male", "ذكر"], ["female", "أنثى"]]} />
          <div className="field">
            <label>تاريخ الميلاد {age && <span className="muted">({age} سنة)</span>}</label>
            <input type="date" value={patient.dob ?? ""} onChange={(e) => upd({ dob: e.target.value })} />
          </div>
          <Inp label="الهاتف" v={patient.phone} on={(v) => upd({ phone: v })} type="tel" />
        </div>
      </div>

      <div className="card">
        <h4 className="sec-title danger-title"><span className="stat-ic"><HeartPulse size={16} /> التاريخ الطبي</span></h4>
        <div className="grid2">
          <Inp label="الحساسية" v={patient.allergy} on={(v) => upd({ allergy: v })} placeholder="بنسلين، مادة التخدير..." />
          <Inp label="الأمراض المزمنة" v={patient.chronic} on={(v) => upd({ chronic: v })} placeholder="سكري، ضغط، قلب..." />
        </div>
        <Inp label="الأدوية الحالية" v={patient.medications} on={(v) => upd({ medications: v })} placeholder="مميّعات، مضادات..." />
        <div className="check-row">
          <Chk label="مدخّن" v={!!patient.smoker} on={(v) => upd({ smoker: v })} />
          <Chk label="مميّع للدم" v={!!patient.bloodThinner} on={(v) => upd({ bloodThinner: v })} />
          {patient.gender !== "male" && <Chk label="حامل" v={!!patient.pregnant} on={(v) => upd({ pregnant: v })} />}
        </div>
      </div>

      <div className="card">
        <div className="field" style={{ margin: 0 }}>
          <label>ملاحظات</label>
          <textarea rows={2} value={patient.notes ?? ""} onChange={(e) => upd({ notes: e.target.value })} />
        </div>
      </div>

      <div className="card">
        <div className="balance">
          <span>المُنفَّذ — المستحق على المريض ✓</span>
          <span className="amt">{done} {cur}</span>
        </div>
        <div className="balance plan">
          <span>الخطة المقترحة — تقدير (لم تُنفَّذ بعد) ◇</span>
          <span className="amt">{plan} {cur}</span>
        </div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>كل التعديلات تُحفظ تلقائياً.</p>
      </div>
    </>
  );
}

function Inp({ label, v, on, type, placeholder }: { label: string; v?: string; on: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={v ?? ""} type={type === "tel" ? "tel" : "text"} inputMode={type === "tel" ? "tel" : undefined}
        placeholder={placeholder} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
function Sel({ label, v, on, opts }: { label: string; v: string; on: (v: string) => void; opts: [string, string][] }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={v} onChange={(e) => on(e.target.value)}>
        {opts.map(([val, txt]) => <option key={val} value={val}>{txt}</option>)}
      </select>
    </div>
  );
}
function Chk({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <label className={`chk ${v ? "on" : ""}`}>
      <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} />
      {label}
    </label>
  );
}
