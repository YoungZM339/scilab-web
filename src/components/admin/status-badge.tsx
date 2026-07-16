import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  return status === "published" ? (
    <Badge variant="published">已发布</Badge>
  ) : (
    <Badge variant="draft">草稿</Badge>
  );
}
