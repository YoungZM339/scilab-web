import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { FormField, FormGrid } from "./form-field";
import { RichTextEditor } from "./rich-text-editor";

export type CommonContentValue = {
  title?: string;
  slug?: string;
  summary?: string | null;
  contentJson?: unknown;
  status?: string;
  featured?: boolean;
  sortOrder?: number;
};

export function CommonContentFields({
  value = {},
  titleLabel = "标题",
  showContent = true,
  showFeatured = true,
}: {
  value?: CommonContentValue;
  titleLabel?: string;
  showContent?: boolean;
  showFeatured?: boolean;
}) {
  return (
    <>
      <FormGrid>
        <FormField label={titleLabel} htmlFor="title" required>
          <Input
            id="title"
            name="title"
            defaultValue={value.title ?? ""}
            required
            maxLength={200}
          />
        </FormField>
        <FormField
          label="网址名称"
          htmlFor="slug"
          description="通常无需填写；留空时会根据标题自动生成。"
        >
          <Input
            id="slug"
            name="slug"
            defaultValue={value.slug ?? ""}
            maxLength={160}
            placeholder="例如：ai-for-science"
          />
        </FormField>
      </FormGrid>
      <FormField
        label="摘要"
        htmlFor="summary"
        description="用一两句话概括内容，方便访客快速了解。"
      >
        <Textarea
          id="summary"
          name="summary"
          defaultValue={value.summary ?? ""}
          maxLength={1000}
          rows={4}
        />
      </FormField>
      {showContent ? (
        <FormField label="正文" htmlFor="contentJson">
          <RichTextEditor
            name="contentJson"
            initialContent={value.contentJson}
          />
        </FormField>
      ) : null}
      <FormGrid>
        <FormField label="发布状态" htmlFor="status" required>
          <Select
            id="status"
            name="status"
            defaultValue={value.status ?? "draft"}
          >
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
          </Select>
        </FormField>
        <FormField
          label="展示顺序"
          htmlFor="sortOrder"
          description="数字较小的内容排在前面。"
        >
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={value.sortOrder ?? 0}
            min={-9999}
            max={9999}
          />
        </FormField>
      </FormGrid>
      {showFeatured ? (
        <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <input
            name="featured"
            type="checkbox"
            defaultChecked={value.featured ?? false}
            className="size-4 rounded border-slate-300 text-[#0052d9] focus:ring-[#0052d9]"
          />
          重点展示这项内容
        </label>
      ) : null}
    </>
  );
}
