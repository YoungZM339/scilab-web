"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

const emptyDocument = { type: "doc", content: [{ type: "paragraph" }] };

function normalizeContent(content: unknown) {
  if (!content) return emptyDocument;
  if (typeof content === "string") {
    try {
      return JSON.parse(content) as object;
    } catch {
      return emptyDocument;
    }
  }
  return content as object;
}

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={active}
      className={cn("size-8", active && "bg-teal-50 text-teal-800")}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  name,
  initialContent,
}: {
  name: string;
  initialContent?: unknown;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(() =>
    JSON.stringify(normalizeContent(initialContent)),
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
        code: false,
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Image.configure({ allowBase64: false, inline: false }),
    ],
    content: normalizeContent(initialContent),
    editorProps: {
      attributes: {
        class:
          "prose prose-slate min-h-72 max-w-none px-4 py-3 text-sm leading-7 outline-none [&_a]:text-teal-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:max-h-96 [&_img]:rounded-lg",
      },
    },
    onUpdate: ({ editor: currentEditor }) =>
      setValue(JSON.stringify(currentEditor.getJSON())),
  });

  async function uploadImage(file: File) {
    if (!editor) return;
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    try {
      const response = await fetch("/api/media", { method: "POST", body });
      const result = (await response.json()) as {
        asset?: { id: number; url?: string; originalName?: string };
        id?: number;
        url?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "图片上传失败");
      const asset: { id?: number; url?: string; originalName?: string } =
        result.asset ?? {
          id: result.id,
          url: result.url,
        };
      if (!asset.id) throw new Error("上传服务未返回图片编号");
      const src = asset.url ?? `/api/media/${asset.id}`;
      editor
        .chain()
        .focus()
        .setImage({ src, alt: asset.originalName ?? "正文图片" })
        .run();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "图片上传失败");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!editor) {
    return (
      <div className="min-h-72 animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
    );
  }

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadImage(file);
        }}
      />
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-100">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 p-2">
          <ToolbarButton
            label="撤销"
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="重做"
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className="size-4" />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-slate-300" />
          <ToolbarButton
            label="二级标题"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="三级标题"
            active={editor.isActive("heading", { level: 3 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <Heading3 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="粗体"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="斜体"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="无序列表"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="有序列表"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="引用"
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="添加链接"
            active={editor.isActive("link")}
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
                return;
              }
              const href = window.prompt("输入链接地址（https://…）");
              if (href)
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href })
                  .run();
            }}
          >
            <Link2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="插入图片"
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
          </ToolbarButton>
        </div>
        <EditorContent editor={editor} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        支持二/三级标题、列表、引用、安全链接与已上传图片；不支持 HTML、iframe
        或任意样式。
      </p>
      {error ? (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
