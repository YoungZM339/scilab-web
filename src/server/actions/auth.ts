"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, requireAdmin } from "@/server/auth";

export async function signOutAction() {
  await requireAdmin();
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/login");
}
