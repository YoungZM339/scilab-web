import { describe, expect, it } from "vitest";
import {
  assertTrustedMutationOrigin,
  InvalidMutationOriginError,
} from "@/server/auth/origin";

function request(origin?: string, fetchSite?: string) {
  const headers = new Headers();
  if (origin) headers.set("Origin", origin);
  if (fetchSite) headers.set("Sec-Fetch-Site", fetchSite);
  return new Request("http://localhost:3000/api/media", {
    method: "POST",
    headers,
  });
}

describe("custom mutation origin validation", () => {
  it("allows a same-origin browser request", () => {
    expect(() =>
      assertTrustedMutationOrigin(
        request("http://localhost:3000", "same-origin"),
      ),
    ).not.toThrow();
  });

  it("rejects missing, cross-origin and sibling-subdomain origins", () => {
    expect(() => assertTrustedMutationOrigin(request())).toThrow(
      InvalidMutationOriginError,
    );
    expect(() =>
      assertTrustedMutationOrigin(
        request("https://attacker.example", "cross-site"),
      ),
    ).toThrow(InvalidMutationOriginError);
    expect(() =>
      assertTrustedMutationOrigin(
        request("https://other.lab.example", "same-site"),
      ),
    ).toThrow(InvalidMutationOriginError);
  });
});
