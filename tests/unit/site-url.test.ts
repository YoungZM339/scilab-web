import { afterEach, describe, expect, it } from "vitest";

import { getSiteOrigin, getTrustedOrigins } from "@/server/config/site-url";

const originalEnvironment = {
  SITE_URL: process.env.SITE_URL,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  AUTH_TRUSTED_ORIGINS: process.env.AUTH_TRUSTED_ORIGINS,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("runtime site URL", () => {
  it("uses and normalizes the server-side SITE_URL", () => {
    process.env.SITE_URL = " https://lab.example.edu/path ";
    process.env.BETTER_AUTH_URL = "https://auth.example.edu";

    expect(getSiteOrigin()).toBe("https://lab.example.edu");
  });

  it("falls back safely and only returns valid trusted origins", () => {
    process.env.SITE_URL = "not a URL";
    process.env.BETTER_AUTH_URL = "https://lab.example.edu/api/auth";
    process.env.AUTH_TRUSTED_ORIGINS =
      "https://preview.example.edu/path,invalid,https://lab.example.edu";

    expect(getSiteOrigin()).toBe("https://lab.example.edu");
    expect(getTrustedOrigins()).toEqual([
      "https://lab.example.edu",
      "https://preview.example.edu",
    ]);
  });
});
