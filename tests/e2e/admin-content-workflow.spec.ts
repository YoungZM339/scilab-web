import { expect, test, type Page } from "@playwright/test";
import BetterSqlite3 from "better-sqlite3";

const prefix = "e2e-content";

async function fillCommonContent(
  page: Page,
  values: { title: string; slug: string; summary: string },
) {
  await page.locator('input[name="title"]').fill(values.title);
  await page.locator('input[name="slug"]').fill(values.slug);
  await page.locator('textarea[name="summary"]').fill(values.summary);
  await page.locator('select[name="status"]').selectOption("published");
}

function clearPreviousWorkflowData() {
  const sqlite = new BetterSqlite3(process.env.DATABASE_PATH!);
  try {
    sqlite.transaction(() => {
      sqlite
        .prepare("delete from publications where title like ?")
        .run(`[E2E]%`);
      for (const table of [
        "news_posts",
        "projects",
        "members",
        "research_areas",
        "pages",
      ]) {
        sqlite
          .prepare(`delete from ${table} where slug like ?`)
          .run(`${prefix}%`);
      }
    })();
  } finally {
    sqlite.close();
  }
}

test("administrator can publish related content and unpublish a detail page", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "完整后台流程仅需执行一次");
  clearPreviousWorkflowData();

  const origin = process.env.BETTER_AUTH_URL!;
  const login = await page.context().request.post("/api/auth/sign-in/email", {
    headers: {
      Origin: origin,
      "X-Forwarded-For": "198.51.100.42",
    },
    data: {
      email: process.env.E2E_ADMIN_EMAIL,
      password: process.env.E2E_ADMIN_PASSWORD,
      rememberMe: true,
    },
  });
  expect(login.status()).toBe(200);

  await page.goto("/admin/settings");
  await page.locator('input[name="siteName"]').fill("[E2E] 科研实验室");
  await page.locator('input[name="tagline"]').fill("可重复的后台验收数据");
  await page.getByRole("button", { name: "保存站点设置" }).click();
  await expect(page).toHaveURL(/\/admin\/settings\?saved=1$/);

  await page.goto("/admin/pages/new");
  await page.locator('select[name="key"]').selectOption("about");
  await fillCommonContent(page, {
    title: "[E2E] 实验室介绍",
    slug: `${prefix}-about`,
    summary: "用于验证固定页面发布流程。",
  });
  await page.getByRole("button", { name: "创建页面" }).click();
  await expect(page).toHaveURL(/\/admin\/pages\/\d+\?saved=1$/);

  await page.goto("/admin/research/new");
  await fillCommonContent(page, {
    title: "[E2E] 可信科研计算",
    slug: `${prefix}-research`,
    summary: "用于验证研究方向、关联和筛选。",
  });
  await page.getByRole("button", { name: "创建研究方向" }).click();
  await expect(page).toHaveURL(/\/admin\/research\/\d+\?saved=1$/);

  await page.goto("/admin/people/new");
  await page.locator('input[name="name"]').fill("[E2E] 测试成员");
  await page.locator('input[name="slug"]').fill(`${prefix}-member`);
  await page.locator('select[name="group"]').selectOption("student");
  await page.locator('input[name="roleTitle"]').fill("博士研究生");
  await page.locator('select[name="status"]').selectOption("published");
  await page.getByRole("button", { name: "创建成员" }).click();
  await expect(page).toHaveURL(/\/admin\/people\/\d+\?saved=1$/);

  await page.goto("/admin/projects/new");
  await fillCommonContent(page, {
    title: "[E2E] 开放科研项目",
    slug: `${prefix}-project`,
    summary: "用于验证项目发布与多对多关联。",
  });
  await page.getByRole("checkbox", { name: /\[E2E\] 测试成员/ }).check();
  await page.getByRole("checkbox", { name: /\[E2E\] 可信科研计算/ }).check();
  await page.getByRole("button", { name: "创建项目" }).click();
  await expect(page).toHaveURL(/\/admin\/projects\/\d+\?saved=1$/);

  await page.goto("/admin/publications/new");
  await page.locator('textarea[name="title"]').fill("[E2E] 可重复科研系统");
  await page.locator('textarea[name="authors"]').fill("测试成员, 示例作者");
  await page.locator('input[name="year"]').fill("2026");
  await page.locator('select[name="type"]').selectOption("journal");
  await page.locator('input[name="doi"]').fill("10.5555/e2e-scilab");
  await page.locator('select[name="status"]').selectOption("published");
  await page.getByRole("checkbox", { name: /\[E2E\] 测试成员/ }).check();
  await page.getByRole("checkbox", { name: /\[E2E\] 开放科研项目/ }).check();
  await page.getByRole("checkbox", { name: /\[E2E\] 可信科研计算/ }).check();
  await page.getByRole("button", { name: "创建成果" }).click();
  await expect(page).toHaveURL(/\/admin\/publications\/\d+\?saved=1$/);

  await page.goto("/admin/news/new");
  await fillCommonContent(page, {
    title: "[E2E] 项目发布动态",
    slug: `${prefix}-news`,
    summary: "用于验证发布与取消发布后的公开隔离。",
  });
  await page.getByRole("button", { name: "创建动态" }).click();
  await expect(page).toHaveURL(/\/admin\/news\/\d+\?saved=1$/);
  const newsEditorUrl = new URL(page.url());

  for (const [path, heading] of [
    ["/about", "[E2E] 实验室介绍"],
    [`/research/${prefix}-research`, "[E2E] 可信科研计算"],
    [`/people/${prefix}-member`, "[E2E] 测试成员"],
    [`/projects/${prefix}-project`, "[E2E] 开放科研项目"],
    [`/news/${prefix}-news`, "[E2E] 项目发布动态"],
  ] as const) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  await page.goto(
    `/publications?year=2026&type=journal&area=${prefix}-research`,
  );
  await expect(page.getByText("[E2E] 可重复科研系统")).toBeVisible();
  await expect(page).toHaveURL(
    /year=2026.*type=journal.*area=e2e-content-research/,
  );

  await page.goto(`${newsEditorUrl.pathname}${newsEditorUrl.search}`);
  await page.locator('select[name="status"]').selectOption("draft");
  await page.getByRole("button", { name: "保存动态" }).click();
  await expect(page).toHaveURL(/\/admin\/news\/\d+\?saved=1$/);

  const unpublished = await page.goto(`/news/${prefix}-news`);
  expect(unpublished?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "页面未找到" })).toBeVisible();
});
