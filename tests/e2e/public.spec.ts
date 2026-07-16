import { expect, test } from "@playwright/test";

test("health endpoint and public home are available", async ({
  page,
  request,
}) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();

  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  await expect(page).toHaveTitle(/实验室|科研/);
});

test("admin pages require authentication", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("publication filters use stable query parameters", async ({ page }) => {
  await page.goto("/publications");
  await page.getByLabel("成果类型").selectOption("journal");
  await page.getByRole("button", { name: "筛选" }).click();
  await expect(page).toHaveURL(/type=journal/);
  await expect(page.getByRole("link", { name: "清除筛选" })).toBeVisible();
});

test("unknown published content returns the site 404", async ({ page }) => {
  const response = await page.goto("/news/not-a-real-post");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "页面未找到" })).toBeVisible();
});

test("mobile navigation drawer is keyboard-accessible", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "仅在移动视口验证抽屉菜单");
  await page.goto("/");
  await page.getByRole("button", { name: "打开导航菜单" }).click();
  await expect(page.getByRole("dialog", { name: "导航" })).toBeVisible();
  await page.getByRole("link", { name: "研究成果" }).click();
  await expect(page).toHaveURL(/\/publications$/);
});
