import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import {
  deleteMediaAsset,
  MediaInUseError,
  openMediaAsset,
} from "@/server/services/media";
import {
  assertTrustedMutationOrigin,
  getSession,
  InvalidMutationOriginError,
  requireAdmin,
} from "@/server/auth";
import { isMediaAssetPublic } from "@/server/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const mediaId = Number(id);
  if (!Number.isInteger(mediaId) || mediaId < 1) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const isPublic = await isMediaAssetPublic(mediaId);
  if (!isPublic && !(await getSession(request.headers))) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const result = await openMediaAsset(mediaId).catch(() => null);
  if (!result) return new NextResponse("Not Found", { status: 404 });

  const { asset, filePath, metadata } = result;
  const etag = `"${asset.sha256}"`;
  if (isPublic && request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "public, no-cache",
      },
    });
  }

  const headers = new Headers({
    "Content-Type": asset.mimeType,
    "Content-Length": String(metadata.size),
    "Cache-Control": isPublic ? "public, no-cache" : "private, no-store",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  });
  if (asset.kind === "pdf") {
    headers.set(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`,
    );
  }

  const stream = Readable.toWeb(
    createReadStream(/* turbopackIgnore: true */ filePath),
  ) as ReadableStream<Uint8Array>;
  return new NextResponse(stream, { headers });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertTrustedMutationOrigin(request);
    await requireAdmin(request.headers);
    const { id } = await params;
    const mediaId = Number(id);
    if (!Number.isInteger(mediaId) || mediaId < 1) {
      return NextResponse.json({ error: "无效的媒体编号" }, { status: 400 });
    }
    const deleted = await deleteMediaAsset(mediaId);
    if (!deleted)
      return NextResponse.json({ error: "媒体不存在" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidMutationOriginError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof MediaInUseError) {
      return NextResponse.json(
        { error: error.message, references: error.references },
        { status: 409 },
      );
    }
    const status = error instanceof Error && "statusCode" in error ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? "请先登录" : "删除失败，请稍后重试" },
      { status },
    );
  }
}
