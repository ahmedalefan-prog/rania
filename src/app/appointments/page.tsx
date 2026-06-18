"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Appointment } from "@/lib/db";
import { useSettings } from "@/components/Providers";
import { CalendarView } from "@/components/appointments/CalendarView";
import { SchedulerView } from "@/components/appointments/SchedulerView";
import { BookingModal } from "@/components/appointments/BookingModal";

export default function AppointmentsPage() {
  const { settings } = useSettings();
  const patientCount = useLiveQuery(() => db.patients.count(), []);
  const [booking, setBooking] = useState<Partial<Appointment> | null>(null);

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 className="page-title">المواعيد</h2>
          <p className="page-sub">
            {settings.apptView === "calendar" ? "تقويم — يوم / أسبوع / شهر" : "جدول احترافي شامل"} ·
            <Link href="/settings" style={{ color: "var(--accent)" }}> تغيير الشكل</Link>
          </p>
        </div>
      </div>

      {patientCount === 0 ? (
        <div className="card"><div className="empty">
          أضف مريضاً أولاً من <Link href="/patients" style={{ color: "var(--accent)" }}>صفحة المرضى</Link> لتبدأ حجز المواعيد.
        </div></div>
      ) : settings.apptView === "calendar" ? (
        <CalendarView openBooking={setBooking} />
      ) : (
        <SchedulerView openBooking={setBooking} />
      )}

      <BookingModal init={booking} onClose={() => setBooking(null)} />
    </>
  );
}
