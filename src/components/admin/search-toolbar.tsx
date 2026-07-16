import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function SearchToolbar({
  query,
  status,
  children,
}: {
  query?: string;
  status?: string;
  children?: React.ReactNode;
}) {
  return (
    <form className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">搜索</span>
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        />
        <Input
          name="q"
          defaultValue={query}
          className="pl-9"
          placeholder="搜索标题、名称或摘要…"
        />
      </label>
      <Select name="status" defaultValue={status ?? ""} className="sm:w-36">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="published">已发布</option>
      </Select>
      {children}
      <Button type="submit" variant="outline">
        筛选
      </Button>
    </form>
  );
}
