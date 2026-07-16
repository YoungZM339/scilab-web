"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DeleteButton({ label = "删除" }: { label?: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        <Trash2 aria-hidden="true" className="size-4" />
        {label}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button type="submit" variant="destructive" size="sm">
        确认删除
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        取消
      </Button>
    </span>
  );
}
