import { describe, expect, it } from "vitest";

import {
  createSlug,
  maxImageBytes,
  richTextDocumentSchema,
  slugSchema,
  uploadFileSchema,
} from "@/server/validation";

describe("server content validation", () => {
  it("creates and accepts readable Unicode slugs", () => {
    const slug = createSlug("可信 AI / 科学发现");
    expect(slug).toBe("可信-ai-科学发现");
    expect(slugSchema.safeParse(slug).success).toBe(true);
    expect(slugSchema.safeParse("../admin").success).toBe(false);
  });

  it("accepts the Tiptap allowlist", () => {
    const result = richTextDocumentSchema.safeParse({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [
            { type: "text", text: "研究方向", marks: [{ type: "bold" }] },
          ],
        },
        {
          type: "image",
          attrs: { src: "/api/media/12", alt: "实验装置", title: null },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it.each([
    { type: "doc", content: [{ type: "heading", attrs: { level: 1 } }] },
    {
      type: "doc",
      content: [
        { type: "image", attrs: { src: "data:image/png;base64,AA==" } },
      ],
    },
    {
      type: "doc",
      content: [{ type: "iframe", attrs: { src: "https://x.test" } }],
    },
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "bad link",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    },
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { style: "position:fixed" },
          content: [{ type: "text", text: "unexpected attributes" }],
        },
      ],
    },
    {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            src: "/api/media/1",
            alt: "测试图片",
            onerror: "alert(1)",
          },
        },
      ],
    },
  ])("rejects unsafe rich text: %#", (document) => {
    expect(richTextDocumentSchema.safeParse(document).success).toBe(false);
  });

  it("enforces upload type and image size", () => {
    const upload = (type: string, size: number) => ({
      name: "asset.bin",
      type,
      size,
      arrayBuffer: async () => new ArrayBuffer(0),
    });

    expect(
      uploadFileSchema.safeParse(upload("image/png", maxImageBytes)).success,
    ).toBe(true);
    expect(
      uploadFileSchema.safeParse(upload("image/png", maxImageBytes + 1))
        .success,
    ).toBe(false);
    expect(
      uploadFileSchema.safeParse(upload("image/svg+xml", 100)).success,
    ).toBe(false);
  });
});
