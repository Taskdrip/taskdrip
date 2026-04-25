// Lightweight client-side image compression using canvas. No external deps.
// Targets a max long-edge dimension and a max file size by re-encoding as JPEG/PNG/WebP.

export interface CompressOptions {
  maxDimension?: number;      // Max width or height in pixels (preserves aspect ratio)
  maxSizeMB?: number;         // Soft target file size in MB (best-effort)
  quality?: number;           // Initial JPEG/WebP quality (0-1)
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png' | 'auto';
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1600,
  maxSizeMB: 1,
  quality: 0.82,
  mimeType: 'auto',
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const opts = { ...DEFAULTS, ...options };

  // Skip non-image, GIFs (animation), or already-tiny files
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif') return file; // don't strip animation
  if (file.type === 'image/svg+xml') return file;
  if (file.size <= opts.maxSizeMB * 1024 * 1024 && opts.maxDimension >= 4096) return file;

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file; // fallback: original file
  }

  const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longEdge > opts.maxDimension ? opts.maxDimension / longEdge : 1;
  const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
  const targetH = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Choose output type
  const outType =
    opts.mimeType === 'auto'
      ? (file.type === 'image/png' ? 'image/png' : 'image/jpeg')
      : opts.mimeType;

  // Iteratively reduce quality if still over target
  let quality = opts.quality;
  let blob: Blob | null = await canvasToBlob(canvas, outType, quality);
  for (let i = 0; i < 4 && blob && blob.size > opts.maxSizeMB * 1024 * 1024 && quality > 0.4; i++) {
    quality = Math.max(0.4, quality - 0.12);
    blob = await canvasToBlob(canvas, outType, quality);
  }
  if (!blob) return file;
  if (blob.size >= file.size) return file; // no benefit, keep original

  const ext = outType === 'image/png' ? 'png' : outType === 'image/webp' ? 'webp' : 'jpg';
  const name = file.name.replace(/\.[^.]+$/, '') + `.${ext}`;
  return new File([blob], name, { type: outType, lastModified: Date.now() });
}

// Helper: read a File as a data URL (after compression, useful for instant previews)
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Human-readable size formatter
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Standard guidance shown next to upload fields
export const IMAGE_GUIDANCE = {
  avatar: { maxMB: 5, recommendedDim: '400×400 px (square)', accept: 'image/*', label: 'Profile photo' },
  banner: { maxMB: 8, recommendedDim: '1500×500 px (3:1)', accept: 'image/*', label: 'Banner image' },
  logo:   { maxMB: 3, recommendedDim: '512×512 px (square, transparent PNG ideal)', accept: 'image/*', label: 'Logo' },
  cover:  { maxMB: 8, recommendedDim: '1200×675 px (16:9)', accept: 'image/*', label: 'Cover image' },
  post:   { maxMB: 10, recommendedDim: '1080×1080 px or 1200×630 px', accept: 'image/*', label: 'Post image' },
  generic:{ maxMB: 10, recommendedDim: '1200×800 px (max 1600 px long edge)', accept: 'image/*', label: 'Image' },
} as const;

export type ImageGuidanceKey = keyof typeof IMAGE_GUIDANCE;
