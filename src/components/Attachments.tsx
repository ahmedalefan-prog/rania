"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ImagePlus, ScanLine, Trash2, X } from "lucide-react";
import { db, type Attachment } from "@/lib/db";
import { useUI } from "@/components/ui";
import { fileToCompressedDataURL } from "@/lib/imageUtil";

const KIND_LABEL: Record<Attachment["kind"], string> = { photo: "صورة", xray: "أشعة" };

export function Attachments({ patientId }: { patientId: number }) {
  const { toast, confirm } = useUI();
  const items = useLiveQuery(
    () => db.attachments.where("patientId").equals(patientId).toArray(),
    [patientId],
  );
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<Attachment | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const xrayRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null, kind: Attachment["kind"]) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      let n = 0;
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const data = await fileToCompressedDataURL(file);
        await db.attachments.add({
          patientId, kind, name: "", data, dateISO: today, createdAt: Date.now() + n,
        });
        n++;
      }
      if (n > 0) toast(`تمت إضافة ${n} ${KIND_LABEL[kind]}`);
    } catch {
      toast("تعذّرت إضافة الصورة", "error");
    } finally {
      setBusy(false);
      if (photoRef.current) photoRef.current.value = "";
      if (xrayRef.current) xrayRef.current.value = "";
    }
  }

  async function remove(a: Attachment) {
    const ok = await confirm({ title: `حذف هذه ${KIND_LABEL[a.kind]}؟`, confirmText: "حذف", danger: true });
    if (ok) { await db.attachments.delete(a.id!); toast("تم الحذف", "info"); }
  }

  const list = [...(items ?? [])].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h4 className="sec-title" style={{ margin: 0 }}>الصور والأشعة ({list.length})</h4>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn stat-ic" disabled={busy} onClick={() => photoRef.current?.click()}>
            <ImagePlus size={16} /> إضافة صورة
          </button>
          <button className="btn btn-ghost stat-ic" disabled={busy} onClick={() => xrayRef.current?.click()}>
            <ScanLine size={16} /> إضافة أشعة
          </button>
        </div>
      </div>
      <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={(e) => addFiles(e.target.files, "photo")} />
      <input ref={xrayRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={(e) => addFiles(e.target.files, "xray")} />

      {busy && <p className="muted" style={{ fontSize: 12 }}>جارٍ معالجة الصور…</p>}

      {list.length === 0 ? (
        <div className="empty">لا توجد صور أو أشعة بعد. أضف من الأزرار أعلاه (يمكن التقاطها بالكاميرا أو اختيارها من الجهاز).</div>
      ) : (
        <div className="media-grid">
          {list.map((a) => (
            <div key={a.id} className="att-card">
              <button className="att-thumb" onClick={() => setZoom(a)}>
                <img src={a.data} alt={a.name || KIND_LABEL[a.kind]} />
                <span className={`att-badge ${a.kind}`}>{KIND_LABEL[a.kind]}</span>
              </button>
              <input className="att-name" placeholder="اسم/وصف…" value={a.name}
                onChange={(e) => db.attachments.update(a.id!, { name: e.target.value })} />
              <div className="att-foot">
                <span className="muted" style={{ fontSize: 11 }}>{a.dateISO}</span>
                <button className="att-del" onClick={() => remove(a)} title="حذف"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {zoom && (
        <div className="overlay center show" onClick={(e) => { if ((e.target as Element).classList.contains("overlay")) setZoom(null); }}>
          <div className="lightbox">
            <button className="lb-close" onClick={() => setZoom(null)}><X size={20} /></button>
            <img src={zoom.data} alt={zoom.name || KIND_LABEL[zoom.kind]} />
            <div className="lb-cap">{KIND_LABEL[zoom.kind]}{zoom.name ? ` — ${zoom.name}` : ""} • {zoom.dateISO}</div>
          </div>
        </div>
      )}
    </div>
  );
}
