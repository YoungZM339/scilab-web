import Link from "next/link";
import { and, desc, eq, like, or } from "drizzle-orm";
import { FileText, Link2 } from "lucide-react";

import { DeleteButton } from "@/components/admin/delete-button";
import { EmptyState } from "@/components/admin/empty-state";
import { MediaLibraryUpload } from "@/components/admin/media-library-upload";
import { PageHeader } from "@/components/admin/page-header";
import { SavedAlert } from "@/components/admin/saved-alert";
import { SearchToolbar } from "@/components/admin/search-toolbar";
import { SubmitButton } from "@/components/admin/submit-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireAdmin } from "@/server/auth";
import { db, getMediaAssetReferences } from "@/server/db";
import { mediaAssets } from "@/server/db/schema";
import {
  deleteMediaAction,
  updateMediaAction,
} from "@/server/actions/news-media-account";

const entityPaths: Record<string, string> = {
  page: "pages",
  member: "people",
  researchArea: "research",
  project: "projects",
  publication: "publications",
  newsPost: "news",
  siteSettings: "settings",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function MediaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    deleted?: string;
    edited?: string;
  }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const conditions = [];
  if (query.q)
    conditions.push(
      or(
        like(mediaAssets.originalName, `%${query.q}%`),
        like(mediaAssets.altText, `%${query.q}%`),
      )!,
    );
  if (query.kind === "image" || query.kind === "pdf")
    conditions.push(eq(mediaAssets.kind, query.kind));
  const assets = await db
    .select()
    .from(mediaAssets)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(mediaAssets.createdAt));
  const references = new Map(
    await Promise.all(
      assets.map(
        async (asset) =>
          [asset.id, await getMediaAssetReferences(asset.id)] as const,
      ),
    ),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="媒体库"
        description="图片上传后会转为 WebP 并移除元数据；PDF 保留原格式。被内容引用的文件不能删除。"
        actions={<MediaLibraryUpload />}
      />
      <SavedAlert
        deleted={query.deleted === "1"}
        saved={Boolean(query.edited)}
      />
      <SearchToolbar query={query.q}>
        <Select name="kind" defaultValue={query.kind ?? ""} className="sm:w-32">
          <option value="">全部类型</option>
          <option value="image">图片</option>
          <option value="pdf">PDF</option>
        </Select>
      </SearchToolbar>
      {assets.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => {
            const refs = references.get(asset.id) ?? [];
            return (
              <article
                key={asset.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <a
                  href={`/api/media/${asset.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-48 place-items-center bg-slate-100"
                >
                  {asset.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/media/${asset.id}`}
                      alt={asset.altText ?? ""}
                      className="size-full object-cover"
                    />
                  ) : (
                    <FileText className="size-14 text-slate-400" />
                  )}
                </a>
                <div className="space-y-4 p-4">
                  <div>
                    <h2
                      className="truncate text-sm font-medium text-slate-900"
                      title={asset.originalName}
                    >
                      {asset.originalName}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {asset.mimeType} · {formatBytes(asset.size)}
                      {asset.width && asset.height
                        ? ` · ${asset.width}×${asset.height}`
                        : ""}
                    </p>
                  </div>
                  <form
                    action={updateMediaAction.bind(null, asset.id)}
                    className="flex gap-2"
                  >
                    <Input
                      name="altText"
                      defaultValue={asset.altText ?? ""}
                      maxLength={300}
                      placeholder="替代文字（无障碍描述）"
                    />
                    <SubmitButton variant="outline" size="sm">
                      保存
                    </SubmitButton>
                  </form>
                  {refs.length ? (
                    <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                      <p className="mb-1 font-medium">
                        被 {refs.length} 处内容引用
                      </p>
                      {refs.slice(0, 4).map((ref) => {
                        const path = entityPaths[ref.entityType];
                        return path ? (
                          <Link
                            key={`${ref.entityType}-${ref.entityId}-${ref.field}`}
                            href={`/admin/${path}${ref.entityType === "siteSettings" ? "" : `/${ref.entityId}`}`}
                            className="flex items-center gap-1 py-0.5 hover:underline"
                          >
                            <Link2 className="size-3" />
                            {ref.label}
                          </Link>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <form
                      action={deleteMediaAction.bind(null, asset.id)}
                      className="flex justify-end"
                    >
                      <DeleteButton label="删除文件" />
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="媒体库为空"
          description="上传 JPEG、PNG、WebP 图片或 PDF 文件。"
          action={<MediaLibraryUpload />}
        />
      )}
    </div>
  );
}
