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
          label="页面路径"
          htmlFor="slug"
          description="留空时根据标题自动生成；已有内容更新标题不会自动改变此值。"
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
        description="用于列表卡片和搜索引擎描述。"
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
          label="排序"
          htmlFor="sortOrder"
          description="数值越小越靠前。"
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
            className="size-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
          />
          在首页或列表重点展示
        </label>
      ) : null}
    </>
  );
}
