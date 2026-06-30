export const AVATAR_MAX_BYTES = 512_000;
export const AVATAR_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function isRenderableAvatarUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("data:image/")
  );
}

export function validateAvatarMimeType(mime: string): boolean {
  return AVATAR_ALLOWED_TYPES.has(mime);
}

export function validateAvatarByteSize(size: number): boolean {
  return size > 0 && size <= AVATAR_MAX_BYTES;
}

export function bufferToAvatarDataUrl(buffer: ArrayBuffer, mime: string): string {
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${mime};base64,${base64}`;
}

export async function compressAvatarFile(file: File, maxBytes = AVATAR_MAX_BYTES): Promise<string> {
  if (!validateAvatarMimeType(file.type)) {
    throw new Error("סוג קובץ לא נתמך");
  }
  if (file.size <= maxBytes && file.type === "image/jpeg") {
    return readFileAsDataUrl(file);
  }

  const bitmap = await createImageBitmap(file);
  const maxSide = 256;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("לא ניתן לעבד את התמונה");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.9;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > maxBytes * 1.37 && quality > 0.45) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > maxBytes * 1.37) {
    throw new Error("התמונה גדולה מדי, נסה קובץ קטן יותר");
  }
  return dataUrl;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("קריאת הקובץ נכשלה"));
    };
    reader.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
    reader.readAsDataURL(file);
  });
}
