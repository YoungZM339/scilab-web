import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { CommonContentFields } from "@/components/admin/content-fields";
import { FormField } from "@/components/admin/form-field";
import { FormSection } from "@/components/admin/form-section";
import { PageHeader } from "@/components/admin/page-header";
import { SaveBar } from "@/components/admin/save-bar";
import { SavedAlert } from "@/components/admin/saved-alert";
import { Select } from "@/components/ui/select";
import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { pageKeys, pages } from "@/server/db/schema";
import { savePageAction } from "@/server/actions/settings-pages";

const labels = {
  about: "实验室介绍",
  join: "加入我们",
  contact: "联系我们",
} as const;

export default async function PageEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const { id: rawId } = await params;
  const isNew = rawId === "new";
  const id = isNew ? null : Number(rawId);
  if (!isNew && (!Number.isSafeInteger(id) || !id)) notFound();
  const [item, existingPages] = await Promise.all([
    id
      ? db
          .select()
          .from(pages)
          .where(eq(pages.id, id))
          .limit(1)
          .then((rows) => rows[0])
      : Promise.resolve(undefined),
    db.select({ key: pages.key }).from(pages),
  ]);
  if (id && !item) notFound();
  const query = await searchParams;
  const used = new Set(existingPages.map((row) => row.key));
  const availableKeys = item
    ? pageKeys
    : pageKeys.filter((key) => !used.has(key));
  return (
    <div className="space-y-6">
      <PageHeader
        title={item ? `编辑：${item.title}` : "新增固定页面"}
        description="固定页面的访问路径由页面类型决定。"
      />
      <SavedAlert saved={query.saved === "1"} />
      {!availableKeys.length ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          三个固定页面均已存在，请返回列表编辑现有页面。
        </p>
      ) : (
        <form action={savePageAction.bind(null, id)} className="space-y-6">
          <FormSection title="页面内容">
            <FormField label="页面类型" htmlFor="key" required>
              <Select
                id="key"
                name="key"
                defaultValue={item?.key ?? availableKeys[0]}
                disabled={Boolean(item)}
              >
                {availableKeys.map((key) => (
                  <option key={key} value={key}>
                    {labels[key]}
                  </option>
                ))}
              </Select>
              {item ? (
                <input type="hidden" name="key" value={item.key} />
              ) : null}
            </FormField>
            <CommonContentFields value={item} showFeatured={false} />
          </FormSection>
          <SaveBar cancelHref="/admin/pages">
            {item ? "保存页面" : "创建页面"}
          </SaveBar>
        </form>
      )}
    </div>
  );
}
