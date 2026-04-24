"use client";

"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { useEffect } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

function ToolbarButton({
  label,
  onClick,
  isActive = false,
}: {
  label: string;
  onClick: () => void;
  isActive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
        isActive
          ? "border-black bg-black text-white"
          : "border-black/10 bg-white text-black hover:bg-black/[0.03]"
      }`}
    >
      {label}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
}: Props) {
const editor = useEditor({
  immediatelyRender: false,
  extensions: [
    StarterKit.configure({
      bulletList: false,
      orderedList: false,
      listItem: false,
    }),
    BulletList.configure({
      HTMLAttributes: {
        class: "list-disc pl-6",
      },
    }),
    OrderedList.configure({
      HTMLAttributes: {
        class: "list-decimal pl-6",
      },
    }),
    ListItem,
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: {
        rel: "noopener noreferrer",
        target: "_blank",
      },
    }),
    Placeholder.configure({
      placeholder,
    }),
  ],
  content: value,
  editorProps: {
    attributes: {
      class:
        "min-h-[320px] rounded-[24px] border border-black/10 bg-white px-5 py-4 outline-none prose prose-neutral max-w-none prose-headings:font-display prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-6 prose-ol:pl-6",
    },
  },
  onUpdate({ editor }) {
    onChange(editor.getHTML());
  },
});
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  function setLink() {
  if (!editor) return;

  const previousUrl = editor.getAttributes("link").href || "";
  const url = window.prompt("Enter URL", previousUrl);

  if (url === null) return;

  if (url === "") {
    editor.chain().focus().unsetLink().run();
    return;
  }

  editor.chain().focus().setLink({ href: url }).run();
}

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 rounded-[24px] border border-black/10 bg-black/[0.02] p-3">
        <ToolbarButton
          label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
        />
        <ToolbarButton
          label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
        />
        <ToolbarButton
          label="H2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
        />
        <ToolbarButton
          label="H3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
        />
        <ToolbarButton
  label="Bullet List"
  onClick={() => editor?.chain().focus().toggleBulletList().run()}
  isActive={editor?.isActive("bulletList") ?? false}
/>

<ToolbarButton
  label="Numbered List"
  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
  isActive={editor?.isActive("orderedList") ?? false}
/>
        <ToolbarButton
          label="Quote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
        />
        <ToolbarButton
          label="Link"
          onClick={setLink}
          isActive={editor.isActive("link")}
        />
        <ToolbarButton
          label="Clear"
          onClick={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
        />
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}