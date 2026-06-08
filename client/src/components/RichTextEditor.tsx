import { useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Quote, Link as LinkIcon,
  Minus, Heading1, Heading2, Heading3, Undo, Redo, Code
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);
  const lastValue = useRef(value);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement !== el && el.innerHTML !== value) {
      el.innerHTML = value || "";
      lastValue.current = value;
    }
  }, [value]);

  const exec = useCallback((command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    const html = editorRef.current?.innerHTML ?? "";
    lastValue.current = html;
    onChange(html);
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (isComposing.current) return;
    const html = editorRef.current?.innerHTML ?? "";
    if (html !== lastValue.current) {
      lastValue.current = html;
      onChange(html);
    }
  }, [onChange]);

  const handleLink = useCallback(() => {
    const url = window.prompt("Enter URL:", "https://");
    if (url) exec("createLink", url);
  }, [exec]);

  const btnClass = "h-7 w-7 p-0 hover:bg-gray-100 border-0";

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="flex flex-wrap gap-0.5 p-1.5 border-b bg-gray-50">
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("bold")} title="Bold"><Bold className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("italic")} title="Italic"><Italic className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("underline")} title="Underline"><UnderlineIcon className="h-3.5 w-3.5" /></Button>
        <div className="w-px h-6 bg-gray-300 mx-0.5 self-center" />
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("formatBlock", "h1")} title="Heading 1"><Heading1 className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("formatBlock", "h2")} title="Heading 2"><Heading2 className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("formatBlock", "h3")} title="Heading 3"><Heading3 className="h-3.5 w-3.5" /></Button>
        <div className="w-px h-6 bg-gray-300 mx-0.5 self-center" />
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("insertUnorderedList")} title="Bullet list"><List className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("insertOrderedList")} title="Numbered list"><ListOrdered className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("formatBlock", "blockquote")} title="Quote"><Quote className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("formatBlock", "pre")} title="Code block"><Code className="h-3.5 w-3.5" /></Button>
        <div className="w-px h-6 bg-gray-300 mx-0.5 self-center" />
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("justifyLeft")} title="Align left"><AlignLeft className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("justifyCenter")} title="Center"><AlignCenter className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("justifyRight")} title="Align right"><AlignRight className="h-3.5 w-3.5" /></Button>
        <div className="w-px h-6 bg-gray-300 mx-0.5 self-center" />
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={handleLink} title="Insert link"><LinkIcon className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("insertHorizontalRule")} title="Divider"><Minus className="h-3.5 w-3.5" /></Button>
        <div className="w-px h-6 bg-gray-300 mx-0.5 self-center" />
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("undo")} title="Undo"><Undo className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btnClass} onClick={() => exec("redo")} title="Redo"><Redo className="h-3.5 w-3.5" /></Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
        data-placeholder={placeholder || "Write content here..."}
        className="min-h-[320px] p-4 text-sm focus:outline-none prose prose-sm max-w-none
          [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2
          [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2
          [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mb-2
          [&_ul]:list-disc [&_ul]:ml-4
          [&_ol]:list-decimal [&_ol]:ml-4
          [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic
          [&_pre]:bg-gray-100 [&_pre]:rounded [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-xs
          [&_a]:text-blue-600 [&_a]:underline
          empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
      />
    </div>
  );
}
