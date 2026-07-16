import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { accessibilityFixtureSlugs as fixtureSlugs } from "./accessibility-fixtures";

const publicRoutes = [
  { label: "首页", path: "/" },
  { label: "关于我们", path: "/about" },
  { label: "团队成员列表", path: "/people" },
  { label: "成员详情", path: `/people/${fixtureSlugs.member}` },
  { label: "研究方向列表", path: "/research" },
  {
    label: "研究方向详情",
    path: `/research/${fixtureSlugs.research}`,
  },
  { label: "科研项目列表", path: "/projects" },
  {
    label: "科研项目详情",
    path: `/projects/${fixtureSlugs.project}`,
  },
  { label: "研究成果", path: "/publications" },
  { label: "实验室动态列表", path: "/news" },
  {
    label: "实验室动态详情",
    path: `/news/${fixtureSlugs.news}`,
  },
  { label: "加入我们", path: "/join" },
  { label: "联系我们", path: "/contact" },
] as const;

const wcagTags = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

test.describe("公开站无障碍", () => {
  test("所有公开页面模板通过 WCAG AA 自动扫描", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "完整扫描仅在桌面视口执行一次",
    );

    for (const route of publicRoutes) {
      await test.step(route.label, async () => {
        const response = await page.goto(route.path);
        expect(response?.status(), `${route.label} 应能公开访问`).toBe(200);
        await expect(page.locator("main")).toBeVisible();

        const results = await new AxeBuilder({ page })
          .withTags(wcagTags)
          .analyze();
        const details = results.violations
          .map(
            (violation) =>
              `${violation.id}: ${violation.help}\n${violation.nodes
                .map(
                  (node) =>
                    `  ${node.target.join(" ")}\n  ${node.failureSummary ?? ""}`,
                )
                .join("\n")}`,
          )
          .join("\n\n");

        expect(
          results.violations,
          `${route.label} (${route.path}) 存在无障碍问题：\n${details}`,
        ).toEqual([]);
      });
    }
  });

  test("页面具有稳定的语言、地标和标题结构", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "语义结构仅需执行一次");
    await page.goto("/research");

    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page
        .getByRole("navigation", { name: "主导航" })
        .getByRole("link", { name: "研究方向" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("跳到主要内容链接可由键盘使用", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "键盘顺序仅需执行一次");
    await page.goto("/");

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "跳到主要内容" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("移动端抽屉支持键盘开关、焦点回归并通过扫描", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "仅在移动视口验证抽屉菜单");
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "打开导航菜单" });
    await trigger.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "导航" });
    await expect(dialog).toBeVisible();
    await expect(
      page.getByRole("button", { name: "关闭导航菜单" }),
    ).toBeFocused();

    const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
    expect(results.violations).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
