"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, CalendarDays, Wallet, Stethoscope, Settings } from "lucide-react";
import { useSettings } from "./Providers";
import { Tooth } from "./icons";

const NAV = [
  { href: "/", label: "الرئيسية", Icon: Home },
  { href: "/patients", label: "المرضى", Icon: Users },
  { href: "/appointments", label: "المواعيد", Icon: CalendarDays },
  { href: "/finance", label: "المحاسبة", Icon: Wallet },
  { href: "/staff", label: "الموظفون", Icon: Stethoscope },
  { href: "/settings", label: "الإعدادات", Icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { settings } = useSettings();

  return (
    <>
      <header className="topbar">
        <div className="logo"><Tooth size={22} /></div>
        <div>
          <h1>{settings.clinicName}</h1>
          <div className="sub">إدارة العيادة — يعمل بدون إنترنت</div>
        </div>
        <div className="spacer" />
        <Link href="/settings" className="iconbtn" aria-label="الإعدادات"><Settings size={18} /></Link>
      </header>

      <div className="layout">
        <nav className="sidebar">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`nav-item ${isActive(pathname, n.href) ? "active" : ""}`}>
              <n.Icon size={19} />{n.label}
            </Link>
          ))}
        </nav>
        <main className="content">{children}</main>
      </div>

      <nav className="bottomnav">
        {NAV.slice(0, 5).map((n) => (
          <Link key={n.href} href={n.href}
            className={isActive(pathname, n.href) ? "active" : ""}>
            <span className="ic"><n.Icon size={20} /></span>{n.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
