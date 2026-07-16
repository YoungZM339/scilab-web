"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-lg rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-slate-950">
          操作未能完成
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {error.message || "发生了意外错误，请检查输入后重试。"}
        </p>
        <Button className="mt-5" onClick={reset}>
          返回并重试
        </Button>
      </div>
    </div>
  );
}
