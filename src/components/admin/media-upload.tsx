"use client";

import { useRef, useState } from "react";
import { FileText, ImageIcon, LoaderCircle, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type UploadedAsset = {
  id: number;
  url?: string;
  originalName?: string;
  mimeType?: string;
};

export function MediaUpload({
  name,
  initialId,
  initialName,
  accept = "image/jpeg,image/png,image/webp",
  label = "选择文件",
}: {
  name: string;
  initialId?: number | null;
  initialName?: string | null;
  accept?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [asset, setAsset] = useState<UploadedAsset | null>(
    initialId
      ? { id: initialId, originalName: initialName ?? undefined }
      : null,
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    try {
      const response = await fetch("/api/media", { method: "POST", body });
      const result = (await response.json()) as {
        asset?: UploadedAsset;
        error?: string;
      } & UploadedAsset;
      if (!response.ok) throw new Error(result.error || "上传失败");
      const uploaded = result.asset ?? result;
      if (!uploaded.id) throw new Error("上传服务未返回文件编号");
      setAsset(uploaded);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "上传失败，请稍后重试",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const isImage =
    asset?.mimeType?.startsWith("image/") ?? accept.includes("image/");

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={asset?.id ?? ""} />
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {asset ? (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.url ?? `/api/media/${asset.id}`}
              alt=""
              className="size-14 rounded-md bg-white object-cover"
            />
          ) : (
            <span className="grid size-14 place-items-center rounded-md bg-white text-slate-500">
              <FileText aria-hidden="true" className="size-6" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              {asset.originalName ?? `媒体文件 #${asset.id}`}
            </p>
            <p className="text-xs text-slate-500">文件编号 {asset.id}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setAsset(null)}
            aria-label="移除文件"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : isImage ? (
            <ImageIcon aria-hidden="true" className="size-4" />
          ) : (
            <Upload aria-hidden="true" className="size-4" />
          )}
          {uploading ? "正在上传…" : label}
        </Button>
      )}
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
