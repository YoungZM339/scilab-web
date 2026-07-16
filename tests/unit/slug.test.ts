import { describe, expect, it } from "vitest";
import { createSlug, isSafeSlug } from "@/lib/slug";

describe("slug helpers", () => {
  it("creates stable ASCII slugs", () => {
    expect(createSlug("Robotics & AI Lab")).toBe("robotics-ai-lab");
  });

  it("keeps Chinese titles readable", () => {
    expect(createSlug("智能感知 与 机器人")).toBe("智能感知-与-机器人");
    expect(isSafeSlug("智能感知-与-机器人")).toBe(true);
  });

  it("rejects unsafe separators", () => {
    expect(isSafeSlug("../admin")).toBe(false);
    expect(isSafeSlug("hello world")).toBe(false);
  });
});
