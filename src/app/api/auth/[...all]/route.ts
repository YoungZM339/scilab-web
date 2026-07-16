import { auth } from "@/server/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = toNextJsHandler(auth);
const blockedAccountMutationPaths = new Set([
  "/api/auth/change-password",
  "/api/auth/update-user",
  "/api/auth/change-email",
  "/api/auth/delete-user",
]);

export const GET = handler.GET;

export function POST(request: Request) {
  const pathname = new URL(request.url).pathname.replace(/\/$/, "");
  if (blockedAccountMutationPaths.has(pathname)) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return handler.POST(request);
}
