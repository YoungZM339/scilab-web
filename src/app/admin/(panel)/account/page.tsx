import { FormField, FormGrid } from "@/components/admin/form-field";
import { FormSection } from "@/components/admin/form-section";
import { PageHeader } from "@/components/admin/page-header";
import { SavedAlert } from "@/components/admin/saved-alert";
import { SubmitButton } from "@/components/admin/submit-button";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/server/auth";
import {
  changePasswordAction,
  updateAccountAction,
} from "@/server/actions/news-media-account";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await requireAdmin();
  const query = await searchParams;
  return (
    <div className="space-y-6">
      <PageHeader
        title="管理员账户"
        description="系统仅允许一个管理员账户；修改密码后需要重新登录。"
      />
      <SavedAlert saved={query.saved === "1"} />
      <form action={updateAccountAction} className="space-y-5">
        <FormSection title="账户信息">
          <FormGrid>
            <FormField label="管理员名称" htmlFor="name" required>
              <Input
                id="name"
                name="name"
                required
                maxLength={120}
                defaultValue={session.user.name}
              />
            </FormField>
            <FormField
              label="登录邮箱"
              htmlFor="email"
              required
              description="邮箱更新后，下次登录请使用新邮箱。"
            >
              <Input
                id="email"
                name="email"
                type="email"
                required
                maxLength={254}
                defaultValue={session.user.email}
              />
            </FormField>
          </FormGrid>
          <div className="flex justify-end">
            <SubmitButton>保存账户信息</SubmitButton>
          </div>
        </FormSection>
      </form>
      <form action={changePasswordAction} className="space-y-5">
        <FormSection
          title="修改密码"
          description="新密码至少 14 个字符。修改成功后，所有现有会话都会失效。"
        >
          <Alert>为了保护管理员账户，请使用与其他网站不同的高强度密码。</Alert>
          <FormField label="当前密码" htmlFor="currentPassword" required>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              minLength={14}
            />
          </FormField>
          <FormGrid>
            <FormField label="新密码" htmlFor="newPassword" required>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={14}
                maxLength={128}
              />
            </FormField>
            <FormField label="确认新密码" htmlFor="confirmPassword" required>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={14}
                maxLength={128}
              />
            </FormField>
          </FormGrid>
          <div className="flex justify-end">
            <SubmitButton variant="destructive">
              更新密码并重新登录
            </SubmitButton>
          </div>
        </FormSection>
      </form>
    </div>
  );
}
