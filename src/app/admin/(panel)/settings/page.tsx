import type { Metadata } from "next";

import { FormField, FormGrid } from "@/components/admin/form-field";
import { FormSection } from "@/components/admin/form-section";
import { MediaUpload } from "@/components/admin/media-upload";
import { PageHeader } from "@/components/admin/page-header";
import { SavedAlert } from "@/components/admin/saved-alert";
import { SubmitButton } from "@/components/admin/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { siteSettings } from "@/server/db/schema";
import { updateSiteSettingsAction } from "@/server/actions/settings-pages";

export const metadata: Metadata = { title: "站点设置 | 管理后台" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const [settings] = await db.select().from(siteSettings).limit(1);
  const query = await searchParams;
  const socialLinks =
    settings?.socialLinksJson
      ?.map((item) => `${item.label} | ${item.url}`)
      .join("\n") ?? "";
  return (
    <div className="space-y-6">
      <PageHeader
        title="站点设置"
        description="管理公开网站的名称、首页主视觉、联系方式和搜索引擎信息。"
      />
      <SavedAlert saved={query.saved === "1"} />
      <form action={updateSiteSettingsAction} className="space-y-6">
        <FormSection title="基本信息">
          <FormGrid>
            <FormField label="实验室名称" htmlFor="siteName" required>
              <Input
                id="siteName"
                name="siteName"
                required
                maxLength={120}
                defaultValue={settings?.siteName ?? "科研实验室"}
              />
            </FormField>
            <FormField label="简短标语" htmlFor="tagline">
              <Input
                id="tagline"
                name="tagline"
                maxLength={200}
                defaultValue={settings?.tagline ?? ""}
              />
            </FormField>
          </FormGrid>
          <FormField label="实验室简介" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              rows={5}
              maxLength={2000}
              defaultValue={settings?.description ?? ""}
            />
          </FormField>
          <FormField label="Logo">
            <MediaUpload
              name="logoImageId"
              initialId={settings?.logoImageId}
              label="上传 Logo"
            />
          </FormField>
        </FormSection>
        <FormSection
          title="首页主视觉"
          description="未上传图片时，公开首页会使用学术网格背景。"
        >
          <FormField label="主标题" htmlFor="heroTitle">
            <Input
              id="heroTitle"
              name="heroTitle"
              maxLength={200}
              defaultValue={settings?.heroTitle ?? ""}
            />
          </FormField>
          <FormField label="副标题" htmlFor="heroSubtitle">
            <Textarea
              id="heroSubtitle"
              name="heroSubtitle"
              rows={3}
              maxLength={500}
              defaultValue={settings?.heroSubtitle ?? ""}
            />
          </FormField>
          <FormField label="主视觉图片">
            <MediaUpload
              name="heroImageId"
              initialId={settings?.heroImageId}
              label="上传主视觉图片"
            />
          </FormField>
        </FormSection>
        <FormSection title="联系与页脚">
          <FormGrid>
            <FormField label="联系邮箱" htmlFor="contactEmail">
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                maxLength={254}
                defaultValue={settings?.contactEmail ?? ""}
              />
            </FormField>
            <FormField label="联系电话" htmlFor="contactPhone">
              <Input
                id="contactPhone"
                name="contactPhone"
                maxLength={80}
                defaultValue={settings?.contactPhone ?? ""}
              />
            </FormField>
          </FormGrid>
          <FormField label="地址" htmlFor="address">
            <Textarea
              id="address"
              name="address"
              rows={3}
              maxLength={500}
              defaultValue={settings?.address ?? ""}
            />
          </FormField>
          <FormField
            label="社交与学术链接"
            htmlFor="socialLinks"
            description="每行一条，格式：名称 | https://地址"
          >
            <Textarea
              id="socialLinks"
              name="socialLinks"
              rows={5}
              defaultValue={socialLinks}
              placeholder="Google Scholar | https://scholar.google.com/…"
            />
          </FormField>
          <FormField label="页脚文字" htmlFor="footerText">
            <Input
              id="footerText"
              name="footerText"
              maxLength={500}
              defaultValue={settings?.footerText ?? ""}
            />
          </FormField>
        </FormSection>
        <FormSection title="搜索引擎信息">
          <FormField label="SEO 标题" htmlFor="seoTitle">
            <Input
              id="seoTitle"
              name="seoTitle"
              maxLength={120}
              defaultValue={settings?.seoTitle ?? ""}
            />
          </FormField>
          <FormField label="SEO 描述" htmlFor="seoDescription">
            <Textarea
              id="seoDescription"
              name="seoDescription"
              rows={3}
              maxLength={300}
              defaultValue={settings?.seoDescription ?? ""}
            />
          </FormField>
        </FormSection>
        <div className="flex justify-end">
          <SubmitButton>保存站点设置</SubmitButton>
        </div>
      </form>
    </div>
  );
}
