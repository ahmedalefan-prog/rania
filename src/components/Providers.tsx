"use client";

import { createContext, useContext, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS, type Settings } from "@/lib/db";
import { applyProcOverrides } from "@/lib/dental";
import { UIProvider } from "./ui";

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
}
const SettingsContext = createContext<Ctx>({
  settings: DEFAULT_SETTINGS,
  update: async () => {},
});

export const useSettings = () => useContext(SettingsContext);

export function Providers({ children }: { children: React.ReactNode }) {
  // قراءة فقط داخل liveQuery — لا كتابة هنا
  const stored = useLiveQuery(() => db.settings.get("app"), []);
  // دمج مع الافتراضيات حتى تُملأ أي حقول أُضيفت لاحقاً ولم تُحفظ بعد
  const settings: Settings = { ...DEFAULT_SETTINGS, ...stored, key: "app" };

  // مزامنة تسميات/ألوان الخدمات المخصّصة مع الكائنات المشتركة قبل عرض الأبناء
  // (متزامن أثناء العرض لتعكسه كل المكوّنات في نفس الـ commit)
  applyProcOverrides(settings.procNames, settings.procColors);

  // زرع الإعدادات الافتراضية مرة واحدة عند أول تشغيل (كتابة خارج liveQuery)
  useEffect(() => {
    db.settings.get("app").then((s) => { if (!s) db.settings.put(DEFAULT_SETTINGS); });
  }, []);

  useEffect(() => {
    document.body.classList.toggle("light", settings.theme === "light");
  }, [settings.theme]);

  const update = async (patch: Partial<Settings>) => {
    await db.settings.put({ ...settings, ...patch, key: "app" });
  };

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      <UIProvider>{children}</UIProvider>
    </SettingsContext.Provider>
  );
}
