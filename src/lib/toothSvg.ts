import type { ToothState } from "./db";
import { SOUND, pcol, isAnterior, type SurfaceKey, type ProcKey } from "./dental";

type Style = "box" | "anat";

// يُرجع وسم SVG كنص (نفس منطق النموذج المعتمد) لعرضه عبر dangerouslySetInnerHTML
export function toothSvg(toothId: number, t: ToothState | undefined, style: Style): string {
  const surf = t?.surfaces ?? {};
  const conds = t?.conditions ?? [];
  const getC = (k: ProcKey) => conds.find((c) => c.key === k);
  const has = (k: ProcKey) => !!getC(k);
  const dash = (k: ProcKey) =>
    getC(k)!.status === "planned" ? ' stroke-dasharray="3 2" opacity="0.6"' : "";

  const sf = (sk: SurfaceKey) => {
    const e = surf[sk];
    if (!e) return `fill="${SOUND}"`;
    const c = pcol(e.key);
    return e.status === "planned"
      ? `fill="${c}" fill-opacity="0.3" stroke-dasharray="2 1.5"`
      : `fill="${c}"`;
  };

  if (style === "anat") return anat();
  return box();

  function box(): string {
    const S = 42, I = 12;
    const o = `${I},${I} ${S - I},${I} ${S - I},${S - I} ${I},${S - I}`;
    const B = `0,0 ${S},0 ${S - I},${I} ${I},${I}`;
    const L = `0,${S} ${S},${S} ${S - I},${S - I} ${I},${S - I}`;
    const M = `${S},0 ${S},${S} ${S - I},${S - I} ${S - I},${I}`;
    const D = `0,0 0,${S} ${I},${S - I} ${I},${I}`;
    let ov = "";
    if (has("rct")) ov += `<line x1="${S / 2}" y1="${S / 2}" x2="${S / 2}" y2="${S - 4}" stroke="${pcol("rct")}" stroke-width="3"${dash("rct")}/><circle cx="${S / 2}" cy="${S / 2}" r="4.5" fill="${pcol("rct")}" stroke="#0b1322"${dash("rct")}/>`;
    if (has("post")) ov += `<line x1="${S / 2}" y1="6" x2="${S / 2}" y2="${S / 2}" stroke="${pcol("post")}" stroke-width="3"${dash("post")}/>`;
    if (has("crown") || has("bridge")) { const k = has("crown") ? "crown" : "bridge"; ov += `<rect x="2" y="2" width="${S - 4}" height="${S - 4}" rx="6" fill="none" stroke="${pcol(k)}" stroke-width="3.5"${dash(k as ProcKey)}/>`; }
    if (has("ortho")) ov += `<rect x="${S / 2 - 5}" y="${S / 2 - 3}" width="10" height="6" rx="1.5" fill="none" stroke="${pcol("ortho")}" stroke-width="2"${dash("ortho")}/>`;
    if (has("implant")) ov += `<g stroke="${pcol("implant")}" stroke-width="2.4" stroke-linecap="round"${dash("implant")}><line x1="${S / 2}" y1="7" x2="${S / 2}" y2="${S - 7}"/><line x1="${S / 2 - 6}" y1="13" x2="${S / 2 + 6}" y2="13"/><line x1="${S / 2 - 6}" y1="20" x2="${S / 2 + 6}" y2="20"/><line x1="${S / 2 - 6}" y1="27" x2="${S / 2 + 6}" y2="27"/></g>`;
    if (has("extract")) ov += `<g stroke="${pcol("extract")}" stroke-width="3.5" stroke-linecap="round"${dash("extract")}><line x1="7" y1="7" x2="${S - 7}" y2="${S - 7}"/><line x1="${S - 7}" y1="7" x2="7" y2="${S - 7}"/></g>`;
    const dim = has("extract") && getC("extract")!.status === "done" ? "opacity:.25" : "";
    return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><g style="${dim}">
      <polygon class="surf" points="${B}" ${sf("B")} data-s="B"></polygon>
      <polygon class="surf" points="${L}" ${sf("L")} data-s="L"></polygon>
      <polygon class="surf" points="${M}" ${sf("M")} data-s="M"></polygon>
      <polygon class="surf" points="${D}" ${sf("D")} data-s="D"></polygon>
      <polygon class="surf" points="${o}" ${sf("O")} data-s="O"></polygon>
      </g>${ov}</svg>`;
  }

  function anat(): string {
    const W = 46, H = 66, ant = isAnterior(toothId), cx = W / 2;
    const extracted = has("extract") && getC("extract")!.status === "done";
    const IVORY = "#e9e0cf", IVS = "#bfb495";
    let roots = "", crown = "";
    if (ant) {
      roots = `<path d="M16,30 Q14,52 ${cx},62 Q32,52 30,30 Z" fill="${IVORY}" stroke="${IVS}"/>`;
      crown = `<path d="M9,5 Q${cx},1 37,5 L34,30 L12,30 Z" fill="${SOUND}" stroke="#475569"/>
        <clipPath id="ca${toothId}"><path d="M9,5 Q${cx},1 37,5 L34,30 L12,30 Z"/></clipPath>
        <g clip-path="url(#ca${toothId})">
          <rect class="surf" data-s="M" x="0" y="0" width="${cx}" height="22" ${sf("M")}/>
          <rect class="surf" data-s="D" x="${cx}" y="0" width="${cx}" height="22" ${sf("D")}/>
          <rect class="surf" data-s="B" x="11" y="2" width="24" height="16" ${sf("B")}/>
          <rect class="surf" data-s="L" x="9" y="22" width="28" height="9" ${sf("L")}/>
        </g>
        <path d="M9,5 Q${cx},1 37,5 L34,30 L12,30 Z" fill="none" stroke="#475569"/>`;
    } else {
      roots = `<path d="M12,32 Q9,54 15,62 L19,40 Z" fill="${IVORY}" stroke="${IVS}"/>
        <path d="M34,32 Q37,54 31,62 L27,40 Z" fill="${IVORY}" stroke="${IVS}"/>
        <rect x="14" y="32" width="18" height="6" fill="${IVORY}"/>`;
      const x0 = 4, y0 = 3, x1 = 42, y1 = 37, i = 11;
      crown = `<clipPath id="ca${toothId}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="7"/></clipPath>
        <g clip-path="url(#ca${toothId})">
          <polygon class="surf" data-s="B" points="${x0},${y0} ${x1},${y0} ${x1 - i},${y0 + i} ${x0 + i},${y0 + i}" ${sf("B")}/>
          <polygon class="surf" data-s="L" points="${x0},${y1} ${x1},${y1} ${x1 - i},${y1 - i} ${x0 + i},${y1 - i}" ${sf("L")}/>
          <polygon class="surf" data-s="M" points="${x1},${y0} ${x1},${y1} ${x1 - i},${y1 - i} ${x1 - i},${y0 + i}" ${sf("M")}/>
          <polygon class="surf" data-s="D" points="${x0},${y0} ${x0},${y1} ${x0 + i},${y1 - i} ${x0 + i},${y0 + i}" ${sf("D")}/>
          <rect class="surf" data-s="O" x="${x0 + i}" y="${y0 + i}" width="${x1 - x0 - 2 * i}" height="${y1 - y0 - 2 * i}" ${sf("O")}/>
        </g>
        <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="7" fill="none" stroke="#475569" stroke-width="1.2"/>`;
    }
    const cy = ant ? 16 : 20;
    let ov = "";
    if (has("rct")) ov += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="58" stroke="${pcol("rct")}" stroke-width="3"${dash("rct")}/><circle cx="${cx}" cy="${cy}" r="4.5" fill="${pcol("rct")}" stroke="#0f172a"${dash("rct")}/>`;
    if (has("post")) ov += `<line x1="${cx}" y1="${cy - 8}" x2="${cx}" y2="40" stroke="${pcol("post")}" stroke-width="3"${dash("post")}/>`;
    if (has("crown") || has("bridge")) { const k = has("crown") ? "crown" : "bridge"; ov += `<rect x="${ant ? 7 : 3}" y="3" width="${ant ? 32 : 40}" height="${ant ? 28 : 34}" rx="7" fill="none" stroke="${pcol(k)}" stroke-width="3"${dash(k as ProcKey)}/>`; }
    if (has("ortho")) ov += `<rect x="${cx - 5}" y="${cy - 3}" width="10" height="6" rx="1.5" fill="none" stroke="${pcol("ortho")}" stroke-width="2"${dash("ortho")}/>`;
    if (has("implant")) ov += `<g stroke="${pcol("implant")}" stroke-width="2.4" stroke-linecap="round"${dash("implant")}><line x1="${cx}" y1="34" x2="${cx}" y2="60"/><line x1="${cx - 6}" y1="40" x2="${cx + 6}" y2="40"/><line x1="${cx - 6}" y1="47" x2="${cx + 6}" y2="47"/><line x1="${cx - 6}" y1="54" x2="${cx + 6}" y2="54"/></g>`;
    if (has("extract")) ov += `<g stroke="${pcol("extract")}" stroke-width="3.5" stroke-linecap="round"${dash("extract")}><line x1="8" y1="6" x2="38" y2="34"/><line x1="38" y1="6" x2="8" y2="34"/></g>`;
    const dim = extracted ? "opacity:.3" : "";
    const rootsHTML = has("implant") ? "" : `<g style="${dim}">${roots}</g>`;
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${rootsHTML}<g style="${dim}">${crown}</g>${ov}</svg>`;
  }
}
