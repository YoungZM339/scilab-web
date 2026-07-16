import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getSession } from "@/server/auth";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return <AdminShell>{children}</AdminShell>;
}
