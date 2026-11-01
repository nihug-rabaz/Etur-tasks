export function documentDownloadHref(documentId: string, download = false): string {
  return `/api/agam/documents/download?id=${encodeURIComponent(documentId)}${download ? "&download=1" : ""}`;
}
