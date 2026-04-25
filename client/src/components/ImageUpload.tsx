import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
  testId?: string;
  accept?: string;
}

export function ImageUpload({ value, onChange, label, className = "", testId = "image-upload", accept = "image/*" }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10 MB.", variant: "destructive" });
      return;
    }

    const fd = new FormData();
    fd.append("image", file);

    try {
      setUploading(true);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      onChange(data.url);
      toast({ title: "Uploaded", description: "Image uploaded successfully." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Try again.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleFileSelect} data-testid={`${testId}-input`} />

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
          <span className="text-sm text-gray-500">{uploading ? "Uploading..." : (label || "Click to upload from device")}</span>
          <span className="text-xs text-gray-400">PNG, JPG, GIF • Max 10 MB</span>
        </button>
      )}

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
