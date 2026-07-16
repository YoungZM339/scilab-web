import { headers as nextHeaders } from "next/headers";

import { auth } from "./config";

export type AdminSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export class AuthenticationError extends Error {
  readonly statusCode = 401;
  readonly code = "UNAUTHORIZED";

  constructor(message = "需要管理员登录") {
    super(message);
    this.name = "AuthenticationError";
  }
}

async function resolveHeaders(requestHeaders?: Headers): Promise<Headers> {
  if (requestHeaders) {
    return requestHeaders;
  }

  return new Headers(await nextHeaders());
}

export async function getSession(
  requestHeaders?: Headers,
): Promise<AdminSession | null> {
  return auth.api.getSession({ headers: await resolveHeaders(requestHeaders) });
}

export async function requireAdmin(
  requestHeaders?: Headers,
): Promise<AdminSession> {
  const currentSession = await getSession(requestHeaders);
  if (!currentSession) {
    throw new AuthenticationError();
  }

  return currentSession;
}
