// أدوات معالجة الصور: قراءة وضغط الصور إلى dataURL مناسب للتخزين في IndexedDB
// نُصغّر الأبعاد ونضغط بصيغة JPEG لتقليل الحجم (مهم لأن البيانات على الجهاز فقط).

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("تعذّر قراءة الصورة"));
    img.src = src;
  });
}

/** يحوّل ملف صورة إلى dataURL مضغوط بحد أقصى للبعد الأكبر. */
export async function fileToCompressedDataURL(
  file: File,
  maxDim = 1600,
  quality = 0.82,
): Promise<string> {
  const original = await readAsDataURL(file);
  // الملفات غير المعروفة الأبعاد (مثل HEIC أحياناً) قد تفشل في التحميل — نُعيد الأصل عندها.
  let img: HTMLImageElement;
  try {
    img = await loadImage(original);
  } catch {
    return original;
  }
  let { width, height } = img;
  if (!width || !height) return original;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0, width, height);
  const out = canvas.toDataURL("image/jpeg", quality);
  // إن لم يُفلح الضغط في تصغير الحجم نُبقي الأصل.
  return out.length < original.length ? out : original;
}
