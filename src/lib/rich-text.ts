import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import sanitizeHtml from "sanitize-html";

export type RichTextDocument = JSONContent;

export const EMPTY_RICH_TEXT: RichTextDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const richTextExtensions = [
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
    protocols: ["http", "https", "mailto"],
  }),
  Image.configure({ allowBase64: false }),
];

export function parseRichText(value: unknown): RichTextDocument {
  if (!value) return EMPTY_RICH_TEXT;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRichTextDocument(parsed) ? parsed : EMPTY_RICH_TEXT;
    } catch {
      return EMPTY_RICH_TEXT;
    }
  }
  return isRichTextDocument(value) ? value : EMPTY_RICH_TEXT;
}

export function isRichTextDocument(value: unknown): value is RichTextDocument {
  return Boolean(
    value && typeof value === "object" && (value as JSONContent).type === "doc",
  );
}

export function renderRichText(value: unknown) {
  const html = generateHTML(parseRichText(value), richTextExtensions);
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "h2",
      "h3",
      "strong",
      "em",
      "s",
      "a",
      "ul",
      "ol",
      "li",
      "blockquote",
      "hr",
      "br",
      "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "data-media-id"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          ...(attribs.href?.startsWith("http")
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {}),
        },
      }),
    },
  });
}
