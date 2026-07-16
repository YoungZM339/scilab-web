"use client";

import { type FormEvent, useState } from "react";
import { LockKeyhole, Mail } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          rememberMe: true,
        }),
      });

      if (!response.ok) {
        setError(
          response.status === 429
            ? "登录尝试次数过多，请稍后再试。"
            : "邮箱或密码不正确，请稍后重试。",
        );
        return;
      }
      window.location.assign("/admin");
    } catch {
      setError("暂时无法登录，请检查网络后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error ? (
        <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert>
      ) : null}
      <div>
        <Label htmlFor="email">管理员邮箱</Label>
        <div className="relative mt-2">
          <Mail
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className="pl-9"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="password">密码</Label>
        <div className="relative mt-2">
          <LockKeyhole
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={14}
            required
            className="pl-9"
          />
        </div>
      </div>
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "正在登录…" : "登录管理后台"}
      </Button>
    </form>
  );
}
