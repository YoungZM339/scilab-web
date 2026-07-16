import { eq } from "drizzle-orm";

import {
  closeDatabase,
  db,
  members,
  newsPosts,
  pages,
  projects,
  publications,
  researchAreas,
  runMigrations,
  siteSettings,
} from "../src/server/db";
import { emptyRichTextDocument } from "../src/server/validation";

const seedDemo =
  process.env.NODE_ENV !== "production" && process.env.SEED_DEMO === "true";

function seedRequiredSettings(): void {
  db.insert(siteSettings)
    .values({
      id: 1,
      siteName: process.env.SITE_NAME?.trim() || "科研实验室",
      socialLinksJson: [],
    })
    .onConflictDoNothing()
    .run();
}

function seedDevelopmentDemo(): void {
  const existing = db
    .select({ id: researchAreas.id })
    .from(researchAreas)
    .limit(1)
    .get();
  if (existing) {
    console.info("检测到已有内容，跳过开发示例数据。");
    return;
  }

  const now = new Date();
  db.transaction((tx) => {
    tx.update(siteSettings)
      .set({
        siteName: "[示例] 计算智能实验室",
        tagline: "面向可信人工智能与科学发现的交叉研究",
        description: "这是仅用于本地开发的示例内容，请在上线前替换。",
        heroTitle: "探索智能系统的边界",
        heroSubtitle: "[示例内容] 连接算法、数据与真实世界科学问题。",
        contactEmail: "demo@example.invalid",
      })
      .where(eq(siteSettings.id, 1))
      .run();

    for (const page of [
      { key: "about" as const, slug: "about", title: "关于我们" },
      { key: "join" as const, slug: "join", title: "加入我们" },
      { key: "contact" as const, slug: "contact", title: "联系我们" },
    ]) {
      tx.insert(pages)
        .values({
          ...page,
          summary: "[示例内容] 请在后台编辑此页面。",
          contentJson: emptyRichTextDocument,
          status: "draft",
        })
        .onConflictDoNothing()
        .run();
    }

    const area = tx
      .insert(researchAreas)
      .values({
        slug: "可信机器学习",
        title: "[示例] 可信机器学习",
        summary: "研究可解释、稳健且安全的机器学习方法。",
        contentJson: emptyRichTextDocument,
        status: "published",
        featured: true,
        publishedAt: now,
      })
      .returning({ id: researchAreas.id })
      .get();

    const member = tx
      .insert(members)
      .values({
        slug: "示例成员",
        name: "[示例] 张老师",
        roleTitle: "实验室负责人",
        group: "principal_investigator",
        bioJson: emptyRichTextDocument,
        status: "published",
        featured: true,
        publishedAt: now,
      })
      .returning({ id: members.id })
      .get();

    const project = tx
      .insert(projects)
      .values({
        slug: "可信科学智能",
        title: "[示例] 可信科学智能",
        summary: "探索可信人工智能在科学发现中的应用。",
        contentJson: emptyRichTextDocument,
        projectStatus: "ongoing",
        status: "published",
        featured: true,
        publishedAt: now,
      })
      .returning({ id: projects.id })
      .get();

    tx.insert(publications)
      .values({
        title: "[示例] 面向科学发现的可信机器学习方法",
        authors: "张老师, 李同学",
        year: now.getFullYear(),
        type: "journal",
        venue: "示例期刊（非真实成果）",
        abstract: "此条目仅用于本地界面开发。",
        status: "published",
        featured: true,
        publishedAt: now,
      })
      .run();

    tx.insert(newsPosts)
      .values({
        slug: "欢迎访问示例网站",
        title: "[示例] 欢迎访问实验室网站",
        summary: "此动态仅用于本地开发，请在上线前删除。",
        contentJson: emptyRichTextDocument,
        status: "published",
        featured: true,
        publishedAt: now,
      })
      .run();

    if (!area || !member || !project) {
      throw new Error("无法创建开发示例数据");
    }
  });
}

try {
  runMigrations();
  seedRequiredSettings();

  if (seedDemo) {
    seedDevelopmentDemo();
    console.info("开发示例数据已写入（所有示例均带有明确标识）。");
  } else {
    console.info("基础设置已初始化；未创建示例内容或管理员账号。");
  }
} finally {
  closeDatabase();
}
