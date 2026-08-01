import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Eye, Code2, ImagePlus, X, Copy, Check } from "lucide-react";

interface EmailBodyEditorProps {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  variables?: string[];
  placeholder?: string;
}

/** Variables available in email templates */
const DEFAULT_VARS = [
  "{{first_name}}", "{{last_name}}", "{{email}}",
  "{{username}}", "{{user_type}}", "{{site_url}}",
];

export function EmailBodyEditor({
  value,
  onChange,
  rows = 18,
  variables,
  placeholder = "<h2>Hello {{first_name}}!</h2>\n<p>Your content here…</p>",
}: EmailBodyEditorProps) {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const vars = variables ?? DEFAULT_VARS;

  // Insert text at cursor position in the textarea
  const insertAtCursor = useCallback((text: string) => {
    const el = textareaRef.current;
    if (!el) { onChange(value + text); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
    });
  }, [value, onChange]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/admin/email/upload-image", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.message || "Upload failed");
      const tag = `<img src="${data.url}" alt="image" style="max-width:100%;height:auto;display:block;margin:8px 0;" />`;
      insertAtCursor(tag);
      toast({ title: "Image inserted into email" });
    } catch (err: any) {
      toast({ title: `Image upload failed: ${err.message}`, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleCopyVar = (v: string) => {
    insertAtCursor(v);
    setCopied(v);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 mr-1">Insert:</span>
        {vars.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => handleCopyVar(v)}
            className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors font-mono"
            title={`Click to insert ${v}`}
          >
            {copied === v ? <Check className="h-3 w-3" /> : null}
            {v}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-dashed"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <span className="animate-spin inline-block w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            {uploading ? "Uploading…" : "Insert Image"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>
      </div>

      {/* Editor / Preview Tabs */}
      <Tabs defaultValue="code" className="w-full">
        <div className="flex items-center border-b border-gray-200 bg-white px-3">
          <TabsList className="h-8 bg-transparent border-0 p-0 gap-1">
            <TabsTrigger
              value="code"
              className="h-7 text-xs px-3 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-none rounded gap-1"
            >
              <Code2 className="h-3.5 w-3.5" />Code
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="h-7 text-xs px-3 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-none rounded gap-1"
            >
              <Eye className="h-3.5 w-3.5" />Preview
            </TabsTrigger>
          </TabsList>
          <span className="ml-auto text-xs text-gray-400 hidden sm:block">
            {value.length.toLocaleString()} chars
          </span>
        </div>

        <TabsContent value="code" className="m-0">
          <div className="relative">
            {/* Line numbers */}
            <div className="flex" style={{ minHeight: `${rows * 1.5}rem` }}>
              <div
                aria-hidden
                className="select-none text-right pr-2 pl-2 py-3 text-xs font-mono text-gray-300 bg-gray-50 border-r border-gray-100 min-w-[2.5rem] leading-[1.6]"
                style={{ userSelect: "none" }}
              >
                {(value || " ").split("\n").map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                spellCheck={false}
                className="flex-1 resize-none p-3 text-xs font-mono leading-[1.6] bg-white text-gray-800 focus:outline-none focus:ring-0 border-0"
                style={{ tabSize: 2 }}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          {value.trim() ? (
            <iframe
              srcDoc={value}
              title="Email Preview"
              className="w-full bg-white"
              style={{ height: `${rows * 1.5}rem`, border: "none" }}
              sandbox="allow-same-origin"
            />
          ) : (
            <div
              className="flex items-center justify-center text-gray-400 bg-gray-50 text-sm"
              style={{ height: `${rows * 1.5}rem` }}
            >
              <div className="text-center">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Add HTML to see a preview</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
