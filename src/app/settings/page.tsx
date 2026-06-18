"use client";

import { useRef } from "react";
import { db } from "@/lib/db";
import { Moon, Sun, LayoutGrid, CalendarDays, LayoutDashboard, Download, Upload } from "lucide-react";
import { useSettings } from "@/components/Providers";
import { useUI } from "@/components/ui";
import { Tooth } from "@/components/icons";
import { m2t, t2m } from "@/lib/appt";
import { PROCEDURES, DEFAULT_PROC_NAME, DEFAULT_PROC_COLOR } from "@/lib/dental";

export default function SettingsPage() {
  const { settings, update } = useSettings();
  const { toast, confirm } = useUI();
  const fileRef = useRef<HTMLInputElement>(null);

  async function backup() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      patients: await db.patients.toArray(),
      charts: await db.charts.toArray(),
      events: await db.events.toArray(),
      appointments: await db.appointments.toArray(),
      transactions: await db.transactions.toArray(),
      employees: await db.employees.toArray(),
      waitlist: await db.waitlist.toArray(),
      attendance: await db.attendance.toArray(),
      attachments: await db.attachments.toArray(),
      settings: await db.settings.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rania-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast("تم تنزيل النسخة الاحتياطية");
  }

  async function restore(file: File) {
    const ok = await confirm({
      title: "استعادة نسخة احتياطية؟",
      body: "سيُستبدل كل المحتوى الحالي بمحتوى الملف. لا يمكن التراجع.",
      confirmText: "استعادة", danger: true,
    });
    if (!ok) return;
    let d;
    try { d = JSON.parse(await file.text()); }
    catch { toast("ملف غير صالح", "error"); return; }
    await db.transaction("rw", [db.patients, db.charts, db.events, db.appointments, db.transactions, db.employees, db.waitlist, db.attendance, db.attachments, db.settings], async () => {
      await Promise.all([db.patients, db.charts, db.events, db.appointments, db.transactions, db.employees, db.waitlist, db.attendance, db.attachments].map((t) => t.clear()));
      if (d.patients) await db.patients.bulkPut(d.patients);
      if (d.charts) await db.charts.bulkPut(d.charts);
      if (d.events) await db.events.bulkPut(d.events);
      if (d.appointments) await db.appointments.bulkPut(d.appointments);
      if (d.transactions) await db.transactions.bulkPut(d.transactions);
      if (d.employees) await db.employees.bulkPut(d.employees);
      if (d.waitlist) await db.waitlist.bulkPut(d.waitlist);
      if (d.attendance) await db.attendance.bulkPut(d.attendance);
      if (d.attachments) await db.attachments.bulkPut(d.attachments);
      if (d.settings?.[0]) await db.settings.put(d.settings[0]);
    });
    toast("تمت الاستعادة بنجاح ✓");
  }

  return (
    <>
      <h2 className="page-title">الإعدادات</h2>
      <p className="page-sub">المظهر والبيانات — تُحفظ تلقائياً على الجهاز</p>

      <div className="card">
        <div className="set-group">
          <h4>مظهر التطبيق</h4>
          <div className="set-opts">
            <button className={settings.theme === "dark" ? "active" : ""} onClick={() => update({ theme: "dark" })}><span className="stat-ic"><Moon size={16} /> داكن</span></button>
            <button className={settings.theme === "light" ? "active" : ""} onClick={() => update({ theme: "light" })}><span className="stat-ic"><Sun size={16} /> فاتح</span></button>
          </div>
        </div>
        <div className="set-group">
          <h4>شكل الأسنان</h4>
          <div className="set-opts">
            <button className={settings.toothStyle === "box" ? "active" : ""} onClick={() => update({ toothStyle: "box" })}><span className="stat-ic"><LayoutGrid size={16} /> مربّع تشريحي</span></button>
            <button className={settings.toothStyle === "anat" ? "active" : ""} onClick={() => update({ toothStyle: "anat" })}><span className="stat-ic"><Tooth size={16} /> تشريحي واقعي</span></button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="set-group" style={{ marginBottom: 0 }}>
          <h4>شكل نظام المواعيد</h4>
          <div className="set-opts">
            <button className={settings.apptView === "calendar" ? "active" : ""} onClick={() => update({ apptView: "calendar" })}><span className="stat-ic"><CalendarDays size={16} /> تقويم</span></button>
            <button className={settings.apptView === "scheduler" ? "active" : ""} onClick={() => update({ apptView: "scheduler" })}><span className="stat-ic"><LayoutDashboard size={16} /> جدول شامل</span></button>
          </div>
        </div>
        <div className="grid2" style={{ marginTop: 14 }}>
          <div className="field"><label>بداية الدوام</label>
            <input type="time" value={m2t(settings.workStart)} onChange={(e) => update({ workStart: t2m(e.target.value) })} /></div>
          <div className="field"><label>نهاية الدوام</label>
            <input type="time" value={m2t(settings.workEnd)} onChange={(e) => update({ workEnd: t2m(e.target.value) })} /></div>
          <div className="field"><label>مدة الموعد الافتراضية (دقيقة)</label>
            <select value={settings.slotMin} onChange={(e) => update({ slotMin: Number(e.target.value) })}>
              {[15, 20, 30, 45, 60].map((d) => <option key={d} value={d}>{d}</option>)}
            </select></div>
        </div>
      </div>

      <div className="card">
        <div className="grid2">
          <div className="field"><label>اسم العيادة</label>
            <input value={settings.clinicName} onChange={(e) => update({ clinicName: e.target.value })} /></div>
          <div className="field"><label>رمز العملة</label>
            <input value={settings.currency} onChange={(e) => update({ currency: e.target.value })} /></div>
        </div>
      </div>

      <div className="card">
        <h4 className="sec-title">الخدمات — الاسم واللون والسعر</h4>
        <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
          عدّل اسم الخدمة، لونها على مخطط الأسنان، وسعرها الافتراضي. التغييرات تظهر في المخطط والسجل والتقرير. اترك الاسم فارغاً لاستخدام الافتراضي.
        </p>
        <div className="svc-head">
          <span className="svc-h-color">اللون</span>
          <span className="svc-h-name">اسم الخدمة</span>
          <span className="svc-h-price">السعر ({settings.currency})</span>
        </div>
        {PROCEDURES.map((p) => (
          <div className="svc-row" key={p.key}>
            <input type="color" className="svc-color" title="لون الخدمة على المخطط"
              value={settings.procColors?.[p.key] || DEFAULT_PROC_COLOR[p.key]}
              onChange={(e) => update({ procColors: { ...settings.procColors, [p.key]: e.target.value } })} />
            <input className="svc-name" value={settings.procNames?.[p.key] ?? ""} placeholder={DEFAULT_PROC_NAME[p.key]}
              onChange={(e) => update({ procNames: { ...settings.procNames, [p.key]: e.target.value } })} />
            <div className="svc-price">
              <input inputMode="decimal" value={settings.prices?.[p.key] ?? p.cost}
                onChange={(e) => update({ prices: { ...settings.prices, [p.key]: Number(e.target.value) || 0 } })} />
            </div>
          </div>
        ))}
        <button className="btn btn-ghost" style={{ marginTop: 10 }}
          onClick={async () => {
            const ok = await confirm({ title: "استعادة الأسماء والألوان الافتراضية؟", body: "لن تتأثر الأسعار.", confirmText: "استعادة" });
            if (ok) { await update({ procNames: {}, procColors: {} }); toast("تمت استعادة الأسماء والألوان الافتراضية"); }
          }}>استعادة الأسماء والألوان الافتراضية</button>
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0, color: "var(--accent)" }}>النسخ الاحتياطي والبيانات</h4>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0 }}>
          ⚠️ البيانات محفوظة على هذا الجهاز فقط. خذ نسخة احتياطية بانتظام واحفظها في iCloud أو أرسلها لبريدك.
        </p>
        <div className="row">
          <button className="btn stat-ic" onClick={backup}><Download size={16} /> نسخة احتياطية</button>
          <button className="btn btn-ghost stat-ic" onClick={() => fileRef.current?.click()}><Upload size={16} /> استعادة</button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); }} />
        </div>
      </div>
    </>
  );
}
