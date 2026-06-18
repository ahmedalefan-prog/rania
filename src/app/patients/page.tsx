"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, HeartPulse, ChevronLeft } from "lucide-react";
import { db, type Patient } from "@/lib/db";
import { useUI } from "@/components/ui";
import { displayAge, medicalAlerts, GENDER_LABEL } from "@/lib/patient";

type Sort = "name" | "newest";

const blank = () => ({
  name: "", fileNo: "", gender: "" as Patient["gender"], dob: "", phone: "",
  allergy: "", chronic: "",
});

export default function PatientsPage() {
  const router = useRouter();
  const { toast, confirm } = useUI();
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState(blank());
  const [touched, setTouched] = useState(false);

  const nameError = touched && !f.name.trim() ? "الاسم مطلوب" : "";

  const filtered = (patients ?? [])
    .filter((p) => p.name.includes(q.trim()) || (p.phone ?? "").includes(q.trim()) || (p.fileNo ?? "").includes(q.trim()))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name, "ar") : b.createdAt - a.createdAt));

  async function addPatient() {
    setTouched(true);
    if (!f.name.trim()) return;
    await db.patients.add({ ...f, name: f.name.trim(), createdAt: Date.now() });
    setF(blank()); setTouched(false); setAdding(false);
    toast("تمت إضافة المريض");
  }

  async function deletePatient(id: number, pname: string) {
    const ok = await confirm({
      title: `حذف المريض «${pname}»؟`,
      body: "سيُحذف ملفه ومخططه وسجله الزمني ومواعيده نهائياً.",
      confirmText: "حذف", danger: true,
    });
    if (!ok) return;
    await db.transaction("rw", [db.patients, db.charts, db.events, db.appointments], async () => {
      await db.patients.delete(id);
      await db.charts.delete(id);
      await db.events.where("patientId").equals(id).delete();
      await db.appointments.where("patientId").equals(id).delete();
    });
    toast("تم حذف المريض", "info");
  }

  const set = (patch: Partial<ReturnType<typeof blank>>) => setF((s) => ({ ...s, ...patch }));

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 className="page-title">المرضى</h2>
          <p className="page-sub">{patients?.length ?? 0} مريض مسجّل</p>
        </div>
        <button className="btn" onClick={() => setAdding((v) => !v)}>{adding ? "إلغاء" : "+ مريض جديد"}</button>
      </div>

      {adding && (
        <div className="card">
          <div className="grid2">
            <div className="field">
              <label>الاسم *</label>
              <input className={nameError ? "invalid" : ""} value={f.name} autoFocus
                onChange={(e) => set({ name: e.target.value })} onBlur={() => setTouched(true)} />
              {nameError && <div className="err">{nameError}</div>}
            </div>
            <div className="field"><label>رقم الملف</label>
              <input value={f.fileNo} onChange={(e) => set({ fileNo: e.target.value })} placeholder="اختياري" /></div>
            <div className="field"><label>الجنس</label>
              <select value={f.gender} onChange={(e) => set({ gender: e.target.value as Patient["gender"] })}>
                <option value="">—</option><option value="male">ذكر</option><option value="female">أنثى</option>
              </select></div>
            <div className="field"><label>تاريخ الميلاد</label>
              <input type="date" value={f.dob} onChange={(e) => set({ dob: e.target.value })} /></div>
            <div className="field"><label>الهاتف</label>
              <input inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
          </div>
          <div className="med-box">
            <div className="med-title stat-ic"><HeartPulse size={14} /> تنبيهات طبية سريعة (يمكن إكمالها لاحقاً)</div>
            <div className="grid2">
              <div className="field" style={{ margin: 0 }}><label>الحساسية</label>
                <input value={f.allergy} onChange={(e) => set({ allergy: e.target.value })} placeholder="مثال: بنسلين، بنج" /></div>
              <div className="field" style={{ margin: 0 }}><label>الأمراض المزمنة</label>
                <input value={f.chronic} onChange={(e) => set({ chronic: e.target.value })} placeholder="مثال: سكري، ضغط" /></div>
            </div>
          </div>
          <button className="btn" style={{ marginTop: 12 }} onClick={addPatient}>حفظ المريض</button>
        </div>
      )}

      <div className="card">
        <div className="toolbar-row">
          <input className="search-input" style={{ flex: 1, minWidth: 180 }}
            placeholder="🔍 بحث بالاسم أو الهاتف أو رقم الملف" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="select-sm" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="name">ترتيب: الاسم</option>
            <option value="newest">ترتيب: الأحدث</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">{q ? "لا نتائج مطابقة." : "لا يوجد مرضى. أضف أول مريض من زر «مريض جديد»."}</div>
        ) : (
          filtered.map((p) => {
            const alerts = medicalAlerts(p);
            const age = displayAge(p);
            const sub = [age ? `${age} سنة` : "", GENDER_LABEL[p.gender ?? ""], p.phone].filter(Boolean).join(" • ");
            return (
              <div key={p.id} className="list-item" onClick={() => router.push(`/patients/${p.id}`)}>
                <div className="avatar">{p.name.trim().charAt(0)}</div>
                <div className="meta">
                  <div className="t1">
                    {p.name}
                    {p.fileNo && <span className="fileno">#{p.fileNo}</span>}
                  </div>
                  <div className="t2">{sub || "—"}</div>
                  {alerts.length > 0 && (
                    <div className="alert-chips">
                      {alerts.slice(0, 3).map((a, i) => (
                        <span key={i} className={`achip ${a.level}`}>⚠ {a.label}</span>
                      ))}
                      {alerts.length > 3 && <span className="achip warn">+{alerts.length - 3}</span>}
                    </div>
                  )}
                </div>
                <button className="del" title="حذف"
                  onClick={(e) => { e.stopPropagation(); deletePatient(p.id!, p.name); }}><Trash2 size={16} /></button>
                <ChevronLeft size={18} style={{ color: "var(--muted)" }} />
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
