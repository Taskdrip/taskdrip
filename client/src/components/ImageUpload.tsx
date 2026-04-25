import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, X, Image as ImageIcon, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { compressImage, formatBytes, IMAGE_GUIDANCE, type ImageGuidanceKey } from "@/lib/imageCompression";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
  testId?: string;
  accept?: string;
  /** Sets the recommended dimensions and max-MB hint shown to users. Defaults to 'generic'. */
  variant?: ImageGuidanceKey;
  /** Override max file size before compression (in MB). */
  maxSizeMB?: number;
  /** Override max output dimension on the long edge (in pixels). */
  maxDimension?: number;
}

export function ImageUpload({
  value,
  onChange,
  label,
  className = "",
  testId = "image-upload",
  accept,
  variant = "generic",
  maxSizeMB,
  maxDimension,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const guidance = IMAGE_GUIDANCE[variant];
  const acceptAttr = accept || guidance.accept;
  const limitMB = maxSizeMB ?? guidance.maxMB;
  const targetMaxDim = maxDimension ?? (variant === 'banner' ? 2400 : variant === 'avatar' || variant === 'logo' ? 800 : 1600);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Hard cap before any work — server allows 25MB but we soft-cap per-variant
    if (file.size > limitMB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${limitMB} MB. Try cropping or exporting at a lower quality.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const originalSize = file.size;
      // Client-side compression — preserves animated GIFs/SVGs untouched
      const compressed = await compressImage(file, {
        maxDimension: targetMaxDim,
        maxSizeMB: Math.min(limitMB, 1.5),
        quality: 0.82,
      });

      const fd = new FormData();
      fd.append("image", compressed);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      onChange(data.url);

      const saved = originalSize - compressed.size;
      const savedPct = saved > 0 ? Math.round((saved / originalSize) * 100) : 0;
      const desc = saved > 1024
        ? `Compressed ${formatBytes(originalSize)} → ${formatBytes(compressed.size)} (saved ${savedPct}%).`
        : `Image uploaded (${formatBytes(compressed.size)}).`;
      toast({ title: "Uploaded", description: desc });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Try again.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <input ref={fileInputRef} type="file" accept={acceptAttr} className="hidden" onChange={handleFileSelect} data-testid={`${testId}-input`} />

      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="preview" className="h-32 w-32 object-cover rounded-lg border" data-testid={`${testId}-preview`} />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            data-testid={`${testId}-remove`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 w-full hover:border-purple-500 transition-colors flex flex-col items-center gap-2"
          data-testid={`${testId}-trigger`}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          ) : (
            <ImageIcon className="w-6 h-6 text-gray-400" />
          )}
          <span className="text-sm text-gray-500">{uploading ? "Compressing & uploading..." : (label || `Click to upload ${guidance.label.toLowerCase()}`)}</span>
        </button>
      )}

      <div className="flex items-start gap-1.5 text-xs text-gray-500">
        <Info className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
        <span data-testid={`${testId}-guidance`}>
          PNG, JPG, GIF or WebP · Max <strong>{limitMB} MB</strong> · Recommended <strong>{guidance.recommendedDim}</strong>. Large images are auto-compressed in your browser.
        </span>
      </div>

      <div className="flex gap-2 items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid={`${testId}-button`}
        >
          {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
          {value ? "Replace" : "Upload"}
        </Button>
        {value && (
          <Input value={value} readOnly className="text-xs h-8 flex-1" data-testid={`${testId}-url`} />
        )}
      </div>
    </div>
  );
}
