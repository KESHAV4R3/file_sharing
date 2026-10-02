/**
 * Reusable utility to reliably trigger browser downloads for files stored in the system.
 * Handles cross-origin issues by downloading via blob URL or the authenticated raw proxy.
 */
export async function downloadFile(
  file: {
    id?: string;
    originalName: string;
    cloudinaryUrl?: string;
  },
  fetchWithAuth?: (url: string, options?: RequestInit) => Promise<Response>
): Promise<void> {
  const filename = file.originalName || 'download';

  // Strategy 1: Fetch through authenticated server proxy with download=1
  if (file.id && fetchWithAuth) {
    try {
      const res = await fetchWithAuth(`/api/files/${file.id}/raw?download=1`);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        triggerAnchorDownload(blobUrl, filename);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        return;
      }
    } catch (err) {
      console.warn('Authenticated blob download failed, falling back to direct URL:', err);
    }
  }

  // Strategy 2: Fetch via direct URL as blob (if CORS allows)
  if (file.cloudinaryUrl) {
    try {
      const res = await fetch(file.cloudinaryUrl, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        triggerAnchorDownload(blobUrl, filename);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        return;
      }
    } catch {
      // Fallback
    }
  }

  // Strategy 3: Direct link click
  const targetUrl = file.id
    ? `/api/files/${file.id}/raw?download=1`
    : (file.cloudinaryUrl || '#');
  triggerAnchorDownload(targetUrl, filename);
}

function triggerAnchorDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
