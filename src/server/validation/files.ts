import { z } from "zod";

import { mediaKinds, type MediaKind } from "../db/schema";

export const imageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const pdfMimeTypes = ["application/pdf"] as const;
export const maxImageBytes = 10 * 1024 * 1024;
export const maxPdfBytes = 25 * 1024 * 1024;

export interface UploadLike {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

function isUploadLike(value: unknown): value is UploadLike {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<UploadLike>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.arrayBuffer === "function"
  );
}

export function getMediaKind(mimeType: string): MediaKind | null {
  if ((imageMimeTypes as readonly string[]).includes(mimeType)) return "image";
  if ((pdfMimeTypes as readonly string[]).includes(mimeType)) return "pdf";
  return null;
}

export const uploadFileSchema = z
  .custom<UploadLike>(isUploadLike, "请选择有效文件")
  .superRefine((file, context) => {
    const kind = getMediaKind(file.type);
    if (!kind) {
      context.addIssue({
        code: "custom",
        message: "仅支持 JPEG、PNG、WebP 图片或 PDF 文件",
      });
      return;
    }

    const maxBytes = kind === "image" ? maxImageBytes : maxPdfBytes;
    if (file.size <= 0 || file.size > maxBytes) {
      context.addIssue({
        code: "custom",
        message: kind === "image" ? "图片不能超过 10MB" : "PDF 不能超过 25MB",
      });
    }
  });

export const mediaKindSchema = z.enum(mediaKinds);
export const mediaMetadataSchema = z.object({
  altText: z.string().trim().max(300).nullable().optional(),
});
