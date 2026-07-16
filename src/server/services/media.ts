import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  mediaAssets,
  members,
  newsPosts,
  pages,
  projects,
  publications,
  researchAreas,
  siteSettings,
} from "@/server/db/schema";

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PDF_MIME = "application/pdf";
const IMAGE_LIMIT = 10 * 1024 * 1024;
const PDF_LIMIT = 25 * 1024 * 1024;

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export class MediaInUseError extends Error {
  constructor(public readonly references: string[]) {
    super(`该媒体正在被 ${references.length} 处内容引用`);
    this.name = "MediaInUseError";
  }
}

export function getUploadDirectory() {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? path.normalize(configured)
      : path.join(/*turbopackIgnore: true*/ process.cwd(), configured);
  }
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "uploads");
}

function assertInsideUploadDirectory(storageKey: string) {
  const uploadDirectory = getUploadDirectory();
  const resolved = path.resolve(
    /* turbopackIgnore: true */ uploadDirectory,
    storageKey,
  );
  if (!resolved.startsWith(`${uploadDirectory}${path.sep}`)) {
    throw new MediaValidationError("非法的媒体路径");
  }
  return resolved;
}

export async function saveMediaFile(file: File, altText?: string | null) {
  if (!file.size) throw new MediaValidationError("文件不能为空");
  if (file.size > PDF_LIMIT) {
    throw new MediaValidationError("文件不能超过 25MB");
  }

  const input = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(input);
  const mime = detected?.mime;

  if (!mime || (!IMAGE_MIMES.has(mime) && mime !== PDF_MIME)) {
    throw new MediaValidationError("仅支持 JPEG、PNG、WebP 图片或 PDF 文件");
  }

  if (IMAGE_MIMES.has(mime) && input.byteLength > IMAGE_LIMIT) {
    throw new MediaValidationError("图片不能超过 10MB");
  }
  if (mime === PDF_MIME && input.byteLength > PDF_LIMIT) {
    throw new MediaValidationError("PDF 不能超过 25MB");
  }

  const uploadDirectory = getUploadDirectory();
  await mkdir(uploadDirectory, { recursive: true });

  let output = input;
  let outputMime = mime;
  let extension = detected.ext;
  let width: number | null = null;
  let height: number | null = null;
  const kind = mime === PDF_MIME ? "pdf" : "image";

  if (kind === "image") {
    const pipeline = sharp(input, { failOn: "error" })
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 86 });
    const result = await pipeline.toBuffer({ resolveWithObject: true });
    output = result.data;
    outputMime = "image/webp";
    extension = "webp";
    width = result.info.width;
    height = result.info.height;
  }

  const storageKey = `${randomUUID()}.${extension}`;
  const finalPath = assertInsideUploadDirectory(storageKey);
  const temporaryPath = `${finalPath}.tmp-${randomUUID()}`;
  await writeFile(temporaryPath, output, { flag: "wx", mode: 0o600 });
  await rename(temporaryPath, finalPath);

  try {
    const [asset] = await db
      .insert(mediaAssets)
      .values({
        kind,
        storageKey,
        originalName: file.name.slice(0, 255) || storageKey,
        fileName: storageKey,
        mimeType: outputMime,
        size: output.byteLength,
        width,
        height,
        altText: altText?.trim().slice(0, 300) || null,
        sha256: createHash("sha256").update(output).digest("hex"),
      })
      .returning();
    return asset;
  } catch (error) {
    await unlink(finalPath).catch(() => undefined);
    throw error;
  }
}

export async function findMediaAsset(id: number) {
  return db.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, id) });
}

export async function openMediaAsset(id: number) {
  const asset = await findMediaAsset(id);
  if (!asset) return null;
  const filePath = assertInsideUploadDirectory(asset.storageKey);
  const metadata = await stat(/* turbopackIgnore: true */ filePath);
  return { asset, filePath, metadata };
}

function documentReferencesMedia(value: unknown, id: number) {
  if (!value) return false;
  const serialized = JSON.stringify(value);
  return serialized.includes(`\"src\":\"/api/media/${id}\"`);
}

export async function getMediaReferences(id: number) {
  const references: string[] = [];
  const [
    settingsRows,
    memberRows,
    areaRows,
    projectRows,
    publicationRows,
    newsRows,
    pageRows,
  ] = await Promise.all([
    db.select().from(siteSettings),
    db.select().from(members),
    db.select().from(researchAreas),
    db.select().from(projects),
    db.select().from(publications),
    db.select().from(newsPosts),
    db.select().from(pages),
  ]);

  for (const row of settingsRows) {
    if (row.heroImageId === id) references.push("站点首页主视觉");
    if (row.logoImageId === id) references.push("站点 Logo");
  }
  for (const row of memberRows) {
    if (row.avatarMediaId === id) references.push(`成员：${row.name}`);
    if (documentReferencesMedia(row.bioJson, id))
      references.push(`成员简介：${row.name}`);
  }
  for (const row of areaRows) {
    if (row.coverMediaId === id) references.push(`研究方向封面：${row.title}`);
    if (documentReferencesMedia(row.contentJson, id))
      references.push(`研究方向正文：${row.title}`);
  }
  for (const row of projectRows) {
    if (row.coverMediaId === id) references.push(`项目封面：${row.title}`);
    if (documentReferencesMedia(row.contentJson, id))
      references.push(`项目正文：${row.title}`);
  }
  for (const row of publicationRows) {
    if (row.pdfMediaId === id) references.push(`论文附件：${row.title}`);
  }
  for (const row of newsRows) {
    if (row.coverMediaId === id) references.push(`动态封面：${row.title}`);
    if (documentReferencesMedia(row.contentJson, id))
      references.push(`动态正文：${row.title}`);
  }
  for (const row of pageRows) {
    if (documentReferencesMedia(row.contentJson, id))
      references.push(`固定页面：${row.title}`);
  }

  return [...new Set(references)];
}

export async function deleteMediaAsset(id: number) {
  const asset = await findMediaAsset(id);
  if (!asset) return false;
  const references = await getMediaReferences(id);
  if (references.length) throw new MediaInUseError(references);

  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  await unlink(assertInsideUploadDirectory(asset.storageKey)).catch(
    () => undefined,
  );
  return true;
}
