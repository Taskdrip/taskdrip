import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Quote, Code,
  Link as LinkIcon, Minus, Undo, Redo, Highlighter
} from "lucide-react";
import { useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
    ],
    content: value || "",
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "min-h-[320px] max-h-[600px] overflow-y-auto outline-none p-4 prose prose-sm max-w-none focus:ring-0",
      },
    },
  });

  useEffect(() => {
    if (editor && value === "") {
      editor.commands.setContent("");
    }
  }, [value, editor]);

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active = false,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );

  const addLink = () => {
    const url = window.prompt("Enter link URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 p-2 flex flex-wrap gap-0.5">
        {/* History */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive("highlight")}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        {/* Link & Divider */}
        <ToolbarButton
          onClick={addLink}
          active={editor.isActive("link")}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div className="relative">
        {editor.isEmpty && placeholder && (
          <p className="absolute top-4 left-4 text-gray-400 pointer-events-none text-sm">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* Word count */}
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 flex justify-between text-xs text-gray-400">
        <span>{editor.storage?.characterCount?.characters?.() || 0} characters</span>
        <span>{editor.getText().split(/\s+/).filter(Boolean).length} words</span>
      </div>

      <style>{`
        .ProseMirror h1 { font-size: 1.75rem; font-weight: 800; margin: 1rem 0 0.5rem; }
        .ProseMirror h2 { font-size: 1.4rem; font-weight: 700; margin: 1rem 0 0.5rem; }
        .ProseMirror h3 { font-size: 1.15rem; font-weight: 600; margin: 0.75rem 0 0.4rem; }
        .ProseMirror p { margin-bottom: 0.75rem; line-height: 1.7; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .ProseMirror li { margin-bottom: 0.25rem; }
        .ProseMirror blockquote { border-left: 4px solid #3b82f6; padding-left: 1rem; color: #4b5563; font-style: italic; margin: 1rem 0; }
        .ProseMirror code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.875rem; font-family: monospace; }
        .ProseMirror pre { background: #1f2937; color: #f9fafb; padding: 1rem; border-radius: 8px; overflow-x: auto; margin: 1rem 0; }
        .ProseMirror pre code { background: none; color: inherit; padding: 0; }
        .ProseMirror a { color: #2563eb; text-decoration: underline; }
        .ProseMirror mark { background: #fef08a; padding: 1px 2px; border-radius: 2px; }
        .ProseMirror hr { border-top: 2px solid #e5e7eb; margin: 1.5rem 0; }
        .ProseMirror strong { font-weight: 700; }
        .ProseMirror em { font-style: italic; }
        .ProseMirror s { text-decoration: line-through; }
      `}</style>
    </div>
  );
}
