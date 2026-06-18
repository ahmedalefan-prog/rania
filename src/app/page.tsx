"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Users, CalendarDays, Wallet, Stethoscope, TrendingUp, ArrowLeft, UserPlus } from "lucide-react";
import { db, type Appointment } from "@/lib/db";
import { useSettings } from "@/components/Providers";
import { ymd, m2t } from "@/lib/appt";

const STATUS: Record<Appointment["status"], { label: string; color: string }> = {
  upcoming: { label: "قادم", color: "var(--accent)" },
  done: { label: "تم", color: "var(--good)" },
  noshow: { label: "لم يحضر", color: "var(--danger)" },
  cancelled: { label: "ملغي", color: "var(--muted)" },
};

export default function Dashboard() {
  const { settings } = useSettings();
  const cur = settings.currency;
  const patients = useLiveQuery(() => db.patients.count(), []);
  const txns = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const appts = useLiveQuery(() => db.appointments.toArray(), []) ?? [];

  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const today = ymd(now);
  const income = txns.filter((t) => t.type === "income" && t.dateISO.startsWith(month)).reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter((t) => t.type === "expense" && t.dateISO.startsWith(month)).reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  const finMax = Math.max(1, income, expense);

  const todays = appts.filter((a) => a.date === today).sort((a, b) => a.start - b.start);

  return (
    <>
      <h2 className="page-title">لوحة العيادة</h2>
      <p className="page-sub">{now.toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>

      {patients === 0 && (
        <div className="card welcome">
          <div>
            <h3 style={{ margin: "0 0 4px" }}>مرحباً بك في {settings.clinicName} 🦷</h3>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>ابدأ بإضافة أول مريض لتفعيل المخطط والمواعيد والمحاسبة.</p>
          </div>
          <Link className="btn stat-ic" href="/patients"><UserPlus size={16} /> إضافة مريض</Link>
        </div>
      )}

      <div className="stats">
        <div className="stat"><div className="v">{patients ?? 0}</div><div className="k stat-ic"><Users size={14} /> المرضى</div></div>
        <div className="stat"><div className="v">{todays.length}</div><div className="k stat-ic"><CalendarDays size={14} /> مواعيد اليوم</div></div>
        <div className="stat"><div className="v" style={{ color: "var(--good)" }}>{income.toLocaleString()} {cur}</div><div className="k stat-ic"><Wallet size={14} /> إيرادات الشهر</div></div>
        <div className="stat"><div className="v" style={{ color: net >= 0 ? "var(--good)" : "var(--danger)" }}>{net.toLocaleString()} {cur}</div><div className="k stat-ic"><TrendingUp size={14} /> صافي الشهر</div></div>
      </div>

      <div className="dash-grid">
        {/* مواعيد اليوم */}
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>مواعيد اليوم</h3>
            <Link href="/appointments" className="muted stat-ic" style={{ fontSize: 13, textDecoration: "none" }}>الكل <ArrowLeft size={14} /></Link>
          </div>
          {todays.length === 0 ? (
            <div className="empty">لا مواعيد اليوم.</div>
          ) : (
            todays.map((a) => (
              <div key={a.id} className="tl-item" style={{ padding: 10 }}>
                <span className="appt-clock">{m2t(a.start)}</span>
                <span className="dot" style={{ background: a.color }} />
                <div className="info">
                  <div className="t1">{a.patientName}</div>
                  <div className="t2">{a.treat}</div>
                </div>
                <span className="status-pill" style={{ color: STATUS[a.status].color, borderColor: STATUS[a.status].color }}>
                  {STATUS[a.status].label}
                </span>
              </div>
            ))
          )}
        </div>

        {/* ملخص مالي الشهر */}
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>مالية الشهر</h3>
          <div className="fin-mini">
            <div className="fm-row">
              <span className="fm-k">الإيرادات</span>
              <span className="fm-bar"><span style={{ width: `${(income / finMax) * 100}%`, background: "var(--good)" }} /></span>
              <span className="fm-v" style={{ color: "var(--good)" }}>{income.toLocaleString()} {cur}</span>
            </div>
            <div className="fm-row">
              <span className="fm-k">المصاريف</span>
              <span className="fm-bar"><span style={{ width: `${(expense / finMax) * 100}%`, background: "var(--danger)" }} /></span>
              <span className="fm-v" style={{ color: "var(--danger)" }}>{expense.toLocaleString()} {cur}</span>
            </div>
          </div>
          <div className="balance" style={{ marginTop: 14 }}>
            <span>الصافي</span>
            <span className="amt" style={{ color: net >= 0 ? "var(--good)" : "var(--danger)" }}>{net.toLocaleString()} {cur}</span>
          </div>
          <Link href="/finance" className="muted stat-ic" style={{ fontSize: 13, textDecoration: "none", marginTop: 10, display: "inline-flex" }}>
            التفاصيل والتقارير <ArrowLeft size={14} />
          </Link>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>روابط سريعة</h3>
        <div className="row">
          <Link className="btn stat-ic" href="/patients"><Users size={16} /> المرضى</Link>
          <Link className="btn btn-ghost stat-ic" href="/appointments"><CalendarDays size={16} /> المواعيد</Link>
          <Link className="btn btn-ghost stat-ic" href="/finance"><Wallet size={16} /> المحاسبة</Link>
          <Link className="btn btn-ghost stat-ic" href="/staff"><Stethoscope size={16} /> الموظفون</Link>
        </div>
      </div>
    </>
  );
}
