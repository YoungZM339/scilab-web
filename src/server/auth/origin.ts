import { getTrustedOrigins } from "@/server/config/site-url";

export class InvalidMutationOriginError extends Error {
  readonly statusCode = 403;

  constructor(message = "请求来源不受信任") {
    super(message);
    this.name = "InvalidMutationOriginError";
  }
}

/** Protects custom cookie-authenticated mutation routes from cross-origin CSRF. */
export function assertTrustedMutationOrigin(request: Request) {
  const originHeader = request.headers.get("origin");
  if (!originHeader) throw new InvalidMutationOriginError("请求缺少 Origin");

  let origin: string;
  try {
    origin = new URL(originHeader).origin;
  } catch {
    throw new InvalidMutationOriginError();
  }

  const allowedOrigins = new Set([
    new URL(request.url).origin,
    ...getTrustedOrigins(),
  ]);
  if (!allowedOrigins.has(origin)) throw new InvalidMutationOriginError();

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new InvalidMutationOriginError();
  }
}
