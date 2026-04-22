import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCw, X, Download, Maximize2 } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caption?: string;
}

export function ImageLightbox({ src, alt, open, onOpenChange, caption }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    if (open) { setScale(1); setRotate(0); setPos({ x: 0, y: 0 }); }
  }, [open, src]);

  const handleDownload = async () => {
    try {
      const a = document.createElement("a");
      a.href = src; a.download = alt || "image";
      a.target = "_blank"; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
    } catch {}
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    dragRef.current = { x: pos.x, y: pos.y, startX: e.clientX, startY: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setPos({ x: dragRef.current.x + (e.clientX - dragRef.current.startX), y: dragRef.current.y + (e.clientY - dragRef.current.startY) });
  };
  const onMouseUp = () => { dragRef.current = null; };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = Math.max(0.5, Math.min(5, scale + (e.deltaY < 0 ? 0.2 : -0.2)));
    setScale(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] sm:max-w-5xl p-0 bg-slate-900 border-slate-800 overflow-hidden" data-testid="image-lightbox">
        <div className="relative h-[88vh] flex flex-col">
          <div className="absolute top-3 right-3 z-50 flex items-center gap-1 bg-slate-800/90 backdrop-blur rounded-lg px-2 py-1.5 ring-1 ring-white/10">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/10" onClick={() => setScale(s => Math.max(0.5, s - 0.25))} data-testid="button-zoom-out"><ZoomOut className="h-4 w-4" /></Button>
            <span className="text-xs text-white/70 tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/10" onClick={() => setScale(s => Math.min(5, s + 0.25))} data-testid="button-zoom-in"><ZoomIn className="h-4 w-4" /></Button>
            <div className="w-px h-5 bg-white/15 mx-1" />
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/10" onClick={() => setRotate(r => r + 90)} data-testid="button-rotate"><RotateCw className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/10" onClick={() => { setScale(1); setRotate(0); setPos({ x: 0, y: 0 }); }} data-testid="button-reset"><Maximize2 className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/10" onClick={handleDownload} data-testid="button-download"><Download className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/10" onClick={() => onOpenChange(false)} data-testid="button-close-lightbox"><X className="h-4 w-4" /></Button>
          </div>

          <div
            className="flex-1 flex items-center justify-center overflow-hidden select-none"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
            style={{ cursor: scale > 1 ? (dragRef.current ? "grabbing" : "grab") : "zoom-in" }}
            onClick={() => { if (scale <= 1) setScale(2); }}
          >
            <img
              src={src}
              alt={alt || "Preview"}
              draggable={false}
              className="max-h-full max-w-full object-contain transition-transform duration-150"
              style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale}) rotate(${rotate}deg)` }}
              data-testid="img-lightbox"
            />
          </div>

          {caption && (
            <div className="px-4 py-2.5 bg-slate-800/90 backdrop-blur text-xs text-white/80 border-t border-white/10">
              {caption}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ZoomableImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  caption?: string;
}

export function ZoomableImage({ caption, className = "", ...imgProps }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
  if (!imgProps.src) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative inline-block overflow-hidden rounded-lg ring-1 ring-slate-200 hover:ring-slate-400 transition-all ${className}`}
        data-testid="button-open-image-preview"
      >
        <img {...imgProps} className="block max-w-full" alt={imgProps.alt || ""} />
        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ZoomIn className="h-6 w-6 text-white drop-shadow" />
        </span>
      </button>
      <ImageLightbox src={imgProps.src as string} alt={imgProps.alt} open={open} onOpenChange={setOpen} caption={caption} />
    </>
  );
}
