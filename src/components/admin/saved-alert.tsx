import { CheckCircle2, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";

export function SavedAlert({
  saved,
  deleted,
}: {
  saved?: boolean;
  deleted?: boolean;
}) {
  if (!saved && !deleted) return null;
  return (
    <Alert className="flex items-center gap-2 border-emerald-200 bg-emerald-50 text-emerald-800">
      {deleted ? (
        <Trash2 aria-hidden="true" className="size-4" />
      ) : (
        <CheckCircle2 aria-hidden="true" className="size-4" />
      )}
      {deleted ? "内容已删除。" : "更改已保存。"}
    </Alert>
  );
}
