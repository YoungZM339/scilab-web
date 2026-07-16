import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";

import { LoginForm } from "@/components/admin/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/server/auth";

export const metadata: Metadata = { title: "管理员登录" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string }>;
}) {
  if (await getSession()) redirect("/admin");
  const query = await searchParams;
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#f5f3ed] px-4 py-12">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(15,23,42,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.05)_1px,transparent_1px)] [background-size:32px_32px]"
      />
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-3 text-slate-950"
        >
          <span className="grid size-11 place-items-center rounded-xl bg-slate-950 text-teal-300">
            <FlaskConical className="size-6" />
          </span>
          <span className="text-lg font-semibold">科研实验室</span>
        </Link>
        <Card className="shadow-xl shadow-slate-950/10">
          <CardHeader>
            <CardTitle className="text-xl">管理员登录</CardTitle>
            <CardDescription>后台仅供实验室内容管理员使用。</CardDescription>
          </CardHeader>
          <CardContent>
            {query.passwordChanged ? (
              <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                密码已更新，请使用新密码重新登录。
              </p>
            ) : null}
            <LoginForm />
          </CardContent>
        </Card>
        <p className="mt-5 text-center text-xs text-slate-500">
          系统不提供公开注册；管理员账户由服务器命令创建。
        </p>
      </div>
    </main>
  );
}
