import Link from "next/link";
import { Pencil, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DeleteButton } from "./delete-button";
import { StatusBadge } from "./status-badge";

export type ContentListRow = {
  id: number;
  title: string;
  subtitle?: string | null;
  status: string;
  featured?: boolean;
  sortOrder?: number;
};

export function ContentListTable({
  rows,
  baseHref,
  deleteAction,
  extraHeader = "排序",
  renderExtra,
}: {
  rows: ContentListRow[];
  baseHref: string;
  deleteAction: (id: number) => Promise<void>;
  extraHeader?: string;
  renderExtra?: (row: ContentListRow) => React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>内容</TableHead>
            <TableHead className="w-28">状态</TableHead>
            <TableHead className="w-24">{extraHeader}</TableHead>
            <TableHead className="w-48 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="flex items-start gap-2">
                  {row.featured ? (
                    <Star
                      aria-label="精选"
                      className="mt-1 size-3.5 shrink-0 fill-amber-400 text-amber-500"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <Link
                      href={`${baseHref}/${row.id}`}
                      className="font-medium text-slate-950 hover:text-teal-700 hover:underline"
                    >
                      {row.title}
                    </Link>
                    {row.subtitle ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {row.subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell>
                {renderExtra ? renderExtra(row) : (row.sortOrder ?? 0)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`${baseHref}/${row.id}`}>
                      <Pencil className="size-4" />
                      编辑
                    </Link>
                  </Button>
                  <form action={deleteAction.bind(null, row.id)}>
                    <DeleteButton />
                  </form>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
