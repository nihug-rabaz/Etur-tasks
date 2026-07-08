export const TAB_ICON_MAX_BYTES = 900_000;
export const TAB_ICON_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function validateTabIconMimeType(mime: string): boolean {
  return TAB_ICON_ALLOWED_TYPES.has(mime);
}

export function validateTabIconByteSize(size: number): boolean {
  return size > 0 && size <= TAB_ICON_MAX_BYTES;
}

export async function compressTabIconFile(file: File, maxBytes = TAB_ICON_MAX_BYTES): Promise<string> {
  if (!validateTabIconMimeType(file.type)) {
    throw new Error("סוג קובץ לא נתמך");
  }

  const bitmap = await createImageBitmap(file);
  const maxSide = 192;
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

  let quality = 0.92;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > maxBytes * 1.37 && quality > 0.5) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > maxBytes * 1.37) {
    throw new Error("התמונה גדולה מדי, נסה קובץ קטן יותר");
  }
  return dataUrl;
}
