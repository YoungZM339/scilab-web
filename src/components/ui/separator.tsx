import { cn } from "./cn";

export function Separator({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-px w-full bg-slate-200", className)}
      role="separator"
    />
  );
}
