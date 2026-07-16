import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

export function FormField({
  label,
  htmlFor,
  description,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </Label>
      <div className="mt-2">{children}</div>
      {description ? (
        <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 md:grid-cols-2">{children}</div>;
}
