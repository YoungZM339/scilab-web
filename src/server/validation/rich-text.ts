import { z } from "zod";

import type {
  RichTextDocument,
  RichTextMark,
  RichTextNode,
} from "../db/schema";

const allowedNodeTypes = new Set([
  "doc",
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "hardBreak",
  "text",
  "image",
]);
const allowedMarkTypes = new Set(["bold", "italic", "strike", "link"]);
const localMediaPattern = /^\/api\/media\/[1-9]\d*$/;
const safeLinkPattern = /^(?:https?:\/\/|mailto:|\/|#)/i;
const maxNodes = 5_000;
const maxDepth = 20;
const maxTextLength = 200_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  const allowed = new Set(allowedKeys);
  return Object.keys(record).every((key) => allowed.has(key));
}

function validateMark(
  mark: unknown,
  context: z.RefinementCtx,
  path: PropertyKey[],
): mark is RichTextMark {
  if (!isRecord(mark) || typeof mark.type !== "string") {
    context.addIssue({ code: "custom", message: "无效的富文本标记", path });
    return false;
  }

  if (!allowedMarkTypes.has(mark.type)) {
    context.addIssue({
      code: "custom",
      message: `不允许的富文本标记：${mark.type}`,
      path,
    });
    return false;
  }

  if (mark.type !== "link") {
    if (!hasOnlyKeys(mark, ["type"])) {
      context.addIssue({
        code: "custom",
        message: `${mark.type} 标记不能包含属性`,
        path,
      });
      return false;
    }
    return true;
  }

  if (!isRecord(mark.attrs)) {
    context.addIssue({ code: "custom", message: "链接缺少属性", path });
    return false;
  }

  const href = mark.attrs.href;
  if (typeof href !== "string" || !safeLinkPattern.test(href)) {
    context.addIssue({
      code: "custom",
      message: "链接仅允许 HTTP(S)、邮箱、站内路径或锚点",
      path,
    });
    return false;
  }

  if (!hasOnlyKeys(mark.attrs, ["href", "target", "rel", "class"])) {
    context.addIssue({ code: "custom", message: "链接包含不允许的属性", path });
    return false;
  }

  if (
    mark.attrs.target !== undefined &&
    mark.attrs.target !== null &&
    mark.attrs.target !== "_blank"
  ) {
    context.addIssue({ code: "custom", message: "不允许的链接 target", path });
    return false;
  }
  if (mark.attrs.class !== undefined && mark.attrs.class !== null) {
    context.addIssue({
      code: "custom",
      message: "链接不能指定 CSS class",
      path,
    });
    return false;
  }

  return true;
}

interface WalkState {
  nodes: number;
  textLength: number;
}

function validateNode(
  node: unknown,
  context: z.RefinementCtx,
  state: WalkState,
  path: PropertyKey[],
  depth: number,
): node is RichTextNode {
  if (!isRecord(node) || typeof node.type !== "string") {
    context.addIssue({ code: "custom", message: "无效的富文本节点", path });
    return false;
  }

  state.nodes += 1;
  if (state.nodes > maxNodes) {
    context.addIssue({ code: "custom", message: "富文本节点过多", path });
    return false;
  }
  if (depth > maxDepth) {
    context.addIssue({ code: "custom", message: "富文本嵌套过深", path });
    return false;
  }
  if (!allowedNodeTypes.has(node.type)) {
    context.addIssue({
      code: "custom",
      message: `不允许的富文本节点：${node.type}`,
      path,
    });
    return false;
  }
  if (!hasOnlyKeys(node, ["type", "attrs", "content", "marks", "text"])) {
    context.addIssue({ code: "custom", message: "节点包含不允许的字段", path });
    return false;
  }

  if (node.type === "text") {
    if (typeof node.text !== "string") {
      context.addIssue({ code: "custom", message: "文本节点缺少内容", path });
      return false;
    }
    if (node.attrs !== undefined || node.content !== undefined) {
      context.addIssue({ code: "custom", message: "文本节点结构无效", path });
      return false;
    }
    state.textLength += node.text.length;
    if (state.textLength > maxTextLength) {
      context.addIssue({ code: "custom", message: "富文本内容过长", path });
      return false;
    }
  } else if (node.text !== undefined || node.marks !== undefined) {
    context.addIssue({
      code: "custom",
      message: "仅文本节点可以包含 text 或 marks",
      path,
    });
    return false;
  }

  if (node.type === "heading") {
    if (
      !isRecord(node.attrs) ||
      !hasOnlyKeys(node.attrs, ["level"]) ||
      (node.attrs.level !== 2 && node.attrs.level !== 3)
    ) {
      context.addIssue({
        code: "custom",
        message: "标题仅允许 H2 或 H3",
        path,
      });
      return false;
    }
  } else if (node.type === "image") {
    if (
      !isRecord(node.attrs) ||
      !hasOnlyKeys(node.attrs, ["src", "alt", "title"])
    ) {
      context.addIssue({ code: "custom", message: "图片属性无效", path });
      return false;
    }
    if (
      typeof node.attrs.src !== "string" ||
      !localMediaPattern.test(node.attrs.src)
    ) {
      context.addIssue({
        code: "custom",
        message: "图片必须引用媒体库，禁止外链或 Base64 图片",
        path,
      });
      return false;
    }
    if (
      typeof node.attrs.alt !== "string" ||
      !node.attrs.alt.trim() ||
      node.attrs.alt.length > 300
    ) {
      context.addIssue({
        code: "custom",
        message: "图片必须填写替代文字",
        path,
      });
      return false;
    }
    if (node.content !== undefined) {
      context.addIssue({ code: "custom", message: "图片不能包含子节点", path });
      return false;
    }
  } else if (node.type === "orderedList" && node.attrs !== undefined) {
    if (
      !isRecord(node.attrs) ||
      !hasOnlyKeys(node.attrs, ["start", "type"]) ||
      (node.attrs.start !== undefined &&
        (!Number.isInteger(node.attrs.start) || Number(node.attrs.start) < 1))
    ) {
      context.addIssue({ code: "custom", message: "有序列表属性无效", path });
      return false;
    }
  } else if (node.attrs !== undefined) {
    context.addIssue({ code: "custom", message: "节点包含不允许的属性", path });
    return false;
  }

  if (Array.isArray(node.marks)) {
    node.marks.forEach((mark, index) =>
      validateMark(mark, context, [...path, "marks", index]),
    );
  } else if (node.marks !== undefined) {
    context.addIssue({ code: "custom", message: "marks 必须是数组", path });
    return false;
  }

  if (Array.isArray(node.content)) {
    node.content.forEach((child, index) =>
      validateNode(
        child,
        context,
        state,
        [...path, "content", index],
        depth + 1,
      ),
    );
  } else if (node.content !== undefined) {
    context.addIssue({ code: "custom", message: "content 必须是数组", path });
    return false;
  }

  return true;
}

function parseJsonInput(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

export const richTextDocumentSchema = z
  .custom<RichTextDocument>(
    (value): value is RichTextDocument =>
      isRecord(value) && value.type === "doc",
    "富文本必须是 Tiptap doc 文档",
  )
  .superRefine((document, context) => {
    validateNode(document, context, { nodes: 0, textLength: 0 }, [], 0);
  });

export const richTextInputSchema = z.preprocess(
  parseJsonInput,
  richTextDocumentSchema.nullable(),
);

export const emptyRichTextDocument: RichTextDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
