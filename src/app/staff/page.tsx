"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { db, type Employee } from "@/lib/db";
import { useSettings } from "@/components/Providers";
import { useUI } from "@/components/ui";
import { AttendanceModal } from "@/components/staff/AttendanceModal";

type Sort = "name" | "salary" | "commit";

export default function StaffPage() {
  const { settings } = useSettings();
  const { toast, confirm } = useUI();
  const cur = settings.currency;
  const staff = useLiveQuery(() => db.employees.orderBy("name").toArray(), []);
  const attendance = useLiveQuery(() => db.attendance.toArray(), []) ?? [];
  const [sort, setSort] = useState<Sort>("name");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [openEmp, setOpenEmp] = useState<Employee | null>(null);

  const nameError = touched && !name.trim() ? "الاسم مطلوب" : "";

  // نسبة الالتزام لكل موظف
  const commitOf = (id: number): number | null => {
    const recs = attendance.filter((a) => a.employeeId === id);
    const p = recs.filter((r) => r.status === "present").length;
    const ab = recs.filter((r) => r.status === "absent").length;
    return p + ab > 0 ? Math.round((p / (p + ab)) * 100) : null;
  };
  const commitColor = (pct: number | null) =>
    pct == null ? "var(--muted)" : pct >= 90 ? "var(--good)" : pct >= 70 ? "#f59e0b" : "var(--danger)";

  const list = [...(staff ?? [])].sort((a, b) => {
    if (sort === "salary") return (b.salary ?? 0) - (a.salary ?? 0);
    if (sort === "commit") return (commitOf(b.id!) ?? -1) - (commitOf(a.id!) ?? -1);
    return a.name.localeCompare(b.name, "ar");
  });

  async function add() {
    setTouched(true);
    if (!name.trim()) return;
    await db.employees.add({ name: name.trim(), role, salary: Number(salary) || 0, phone });
    setName(""); setRole(""); setSalary(""); setPhone(""); setTouched(false); setAdding(false);
    toast("تمت إضافة الموظف");
  }
  async function remove(e: Employee) {
    const ok = await confirm({ title: `حذف «${e.name}»؟`, body: "سيُحذف سجل حضوره أيضاً.", confirmText: "حذف", danger: true });
    if (!ok) return;
    await db.transaction("rw", [db.employees, db.attendance], async () => {
      await db.employees.delete(e.id!);
      await db.attendance.where("employeeId").equals(e.id!).delete();
    });
    toast("تم الحذف", "info");
  }

  const payroll = (staff ?? []).reduce((s, e) => s + (e.salary || 0), 0);

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div><h2 className="page-title">الموظفون</h2><p className="page-sub">{staff?.length ?? 0} موظف • إجمالي الرواتب {payroll} {cur}</p></div>
        <button className="btn" onClick={() => setAdding((v) => !v)}>{adding ? "إلغاء" : "+ موظف جديد"}</button>
      </div>

      {adding && (
        <div className="card">
          <div className="grid2">
            <div className="field"><label>الاسم *</label>
              <input className={nameError ? "invalid" : ""} value={name} autoFocus
                onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} />
              {nameError && <div className="err">{nameError}</div>}
            </div>
            <div className="field"><label>الوظيفة</label><input value={role} onChange={(e) => setRole(e.target.value)} placeholder="مساعدة، استقبال..." /></div>
            <div className="field"><label>الراتب ({cur})</label><input inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value)} /></div>
            <div className="field"><label>الهاتف</label><input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <button className="btn" onClick={add}>حفظ الموظف</button>
        </div>
      )}

      <div className="card">
        <div className="toolbar-row">
          <span className="muted" style={{ fontSize: 13 }}>اضغط على اسم الموظف لتسجيل الحضور</span>
          <select className="select-sm right" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="name">ترتيب: الاسم</option>
            <option value="salary">ترتيب: الراتب</option>
            <option value="commit">ترتيب: الالتزام</option>
          </select>
        </div>

        {list.length === 0 ? (
          <div className="empty">لا موظفين بعد.</div>
        ) : (
          list.map((e) => {
            const pct = commitOf(e.id!);
            return (
              <div key={e.id} className="list-item" onClick={() => setOpenEmp(e)}>
                <div className="avatar">{e.name.trim().charAt(0)}</div>
                <div className="meta">
                  <div className="t1">{e.name}</div>
                  <div className="t2">{[e.role, e.phone].filter(Boolean).join(" • ") || "—"}</div>
                </div>
                <div className="emp-right">
                  <span className="commit-badge" style={{ color: commitColor(pct), background: "var(--panel)" }}>
                    {pct == null ? "— التزام" : `${pct}% التزام`}
                  </span>
                  <span className="emp-salary">{e.salary ? `${e.salary} ${cur}` : "—"}</span>
                </div>
                <button className="del" onClick={(ev) => { ev.stopPropagation(); remove(e); }}><Trash2 size={16} /></button>
              </div>
            );
          })
        )}
      </div>

      {openEmp && <AttendanceModal employee={openEmp} onClose={() => setOpenEmp(null)} />}
    </>
  );
}
