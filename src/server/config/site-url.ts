const DEFAULT_SITE_ORIGIN = "http://localhost:3000";

function toOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

/**
 * Public origin used by metadata, robots and sitemap. This intentionally uses
 * a server-only variable so a prebuilt Docker image can move between domains
 * without being rebuilt.
 */
export function getSiteOrigin(): string {
  return (
    toOrigin(process.env.SITE_URL) ??
    toOrigin(process.env.BETTER_AUTH_URL) ??
    DEFAULT_SITE_ORIGIN
  );
}

export function getTrustedOrigins(): string[] {
  const configured = [
    process.env.BETTER_AUTH_URL,
    process.env.SITE_URL,
    ...(process.env.AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
  ];

  return [...new Set(configured.flatMap((value) => toOrigin(value) ?? []))];
}
