import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { SubmitButton } from "./submit-button";

export function SaveBar({
  cancelHref,
  children = "保存更改",
  secondary,
}: {
  cancelHref: string;
  children?: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
      {secondary}
      <Button asChild variant="ghost">
        <Link href={cancelHref}>返回列表</Link>
      </Button>
      <SubmitButton>{children}</SubmitButton>
    </div>
  );
}
