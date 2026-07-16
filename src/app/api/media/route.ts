import { MediaValidationError, saveMediaFile } from "@/server/services/media";
import {
  assertTrustedMutationOrigin,
  InvalidMutationOriginError,
  requireAdmin,
} from "@/server/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    await requireAdmin(request.headers);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 26 * 1024 * 1024) {
      return NextResponse.json(
        { error: "上传请求不能超过 26MB" },
        { status: 413 },
      );
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "请选择要上传的文件" },
        { status: 400 },
      );
    }

    const altText = formData.get("altText");
    const asset = await saveMediaFile(
      file,
      typeof altText === "string" ? altText : null,
    );
    return NextResponse.json(
      {
        asset: {
          ...asset,
          url: `/api/media/${asset.id}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof InvalidMutationOriginError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof MediaValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const status = error instanceof Error && "statusCode" in error ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? "请先登录" : "上传失败，请稍后重试" },
      { status },
    );
  }
}
