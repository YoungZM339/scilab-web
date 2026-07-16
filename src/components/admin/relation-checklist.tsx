import { cn } from "@/components/ui/cn";

export type RelationOption = {
  id: number;
  label: string;
  meta?: string | null;
};

export function RelationChecklist({
  name,
  options,
  selected = [],
  emptyText = "暂无可关联内容。",
  className,
}: {
  name: string;
  options: RelationOption[];
  selected?: number[];
  emptyText?: string;
  className?: string;
}) {
  if (!options.length)
    return <p className="text-sm text-slate-500">{emptyText}</p>;
  const selectedSet = new Set(selected);
  return (
    <div
      className={cn(
        "grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2",
        className,
      )}
    >
      {options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-start gap-3 rounded-md p-2 text-sm hover:bg-slate-50"
        >
          <input
            type="checkbox"
            name={name}
            value={option.id}
            defaultChecked={selectedSet.has(option.id)}
            className="mt-0.5 size-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
          />
          <span className="min-w-0">
            <span className="block font-medium text-slate-800">
              {option.label}
            </span>
            {option.meta ? (
              <span className="block truncate text-xs text-slate-500">
                {option.meta}
              </span>
            ) : null}
          </span>
        </label>
      ))}
    </div>
  );
}
