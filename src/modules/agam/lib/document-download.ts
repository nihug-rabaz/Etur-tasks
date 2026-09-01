export function documentDownloadHref(documentId: string): string {
  return `/api/agam/documents/download?id=${encodeURIComponent(documentId)}`;
}
