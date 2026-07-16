import { describe, expect, it } from "vitest";
import { parseRichText, renderRichText } from "@/lib/rich-text";

describe("rich text", () => {
  it("falls back to an empty document for invalid input", () => {
    expect(parseRichText("not-json").type).toBe("doc");
  });

  it("renders allowed content and secures external links", () => {
    const html = renderRichText({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "OpenAI",
              marks: [{ type: "link", attrs: { href: "https://openai.com" } }],
            },
          ],
        },
      ],
    });
    expect(html).toContain("OpenAI");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("<script");
  });
});
