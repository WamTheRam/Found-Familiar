/*
 * Photos are decoded, downscaled and re-encoded as JPEG before being stored, so
 * a 12 MP phone photo does not fill the browser's storage. The result is what
 * is saved in IndexedDB; the original file reference is never kept.
 */
export const MAX_PHOTO_EDGE = 1600;
export const THUMB_EDGE = 240;
const MAX_INPUT_BYTES = 40 * 1024 * 1024;

export class PhotoError extends Error {}

/** Scale to fit inside max x max, preserving aspect ratio, never enlarging. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

interface Decoded { source: CanvasImageSource; width: number; height: number; close: () => void }

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch { /* fall through to <img> */ }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode failed'));
      img.src = url;
    });
  } catch {
    URL.revokeObjectURL(url);
    throw new PhotoError('That file could not be read as a picture. Try a JPEG or PNG.');
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

function render(dec: Decoded, edge: number, quality: number): Promise<Blob> {
  const { width, height } = fitWithin(dec.width, dec.height, edge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new PhotoError('Your browser could not process that picture.'));
  ctx.fillStyle = '#ffffff'; // flatten transparency
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(dec.source, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new PhotoError('Your browser could not process that picture.'))), 'image/jpeg', quality);
  });
}

export async function prepareJournalPhoto(file: File): Promise<{ blob: Blob; thumb: Blob }> {
  if (file.type && !file.type.startsWith('image/')) throw new PhotoError('Please choose a picture file.');
  if (file.size > MAX_INPUT_BYTES) throw new PhotoError('That picture is too large (over 40 MB).');
  const dec = await decode(file);
  try {
    if (!dec.width || !dec.height) throw new PhotoError('That file could not be read as a picture.');
    return { blob: await render(dec, MAX_PHOTO_EDGE, 0.85), thumb: await render(dec, THUMB_EDGE, 0.8) };
  } finally {
    dec.close();
  }
}
