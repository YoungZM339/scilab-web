import type BetterSqlite3 from "better-sqlite3";

export const accessibilityFixtureSlugs = {
  member: "a11y-fixture-member",
  news: "a11y-fixture-news",
  project: "a11y-fixture-project",
  research: "a11y-fixture-research",
} as const;

const fixtureDoi = "10.5555/a11y-fixture";
const richTextFixture = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "研究简介" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "这是一段用于无障碍验收的公开内容，包含" },
        {
          type: "text",
          marks: [
            {
              type: "link",
              attrs: {
                href: "https://example.com/research",
                target: "_blank",
                rel: "noopener noreferrer",
              },
            },
          ],
          text: "外部研究链接",
        },
        { type: "text", text: "。" },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "可重复的实验方法" }],
            },
          ],
        },
      ],
    },
  ],
});

export function seedPublicAccessibilityFixtures(
  sqlite: BetterSqlite3.Database,
): void {
  const now = Date.now();
  sqlite.transaction(() => {
    const area = sqlite
      .prepare(
        `insert into research_areas (
          slug, title, summary, content_json, status, featured, published_at
        ) values (?, ?, ?, ?, 'published', 1, ?) returning id`,
      )
      .get(
        accessibilityFixtureSlugs.research,
        "可信机器学习",
        "研究可解释、稳健且安全的机器学习方法。",
        richTextFixture,
        now,
      ) as { id: number };
    const member = sqlite
      .prepare(
        `insert into members (
          slug, name, role_title, member_group, email, website, orcid,
          bio_json, status, featured, published_at
        ) values (?, ?, ?, 'principal_investigator', ?, ?, ?, ?, 'published', 1, ?)
        returning id`,
      )
      .get(
        accessibilityFixtureSlugs.member,
        "王教授",
        "实验室负责人",
        "wang@example.com",
        "https://example.com/wang",
        "0000-0002-1825-0097",
        richTextFixture,
        now,
      ) as { id: number };
    const project = sqlite
      .prepare(
        `insert into projects (
          slug, title, summary, content_json, project_status, status,
          start_date, funding, external_url, featured, published_at
        ) values (?, ?, ?, ?, 'ongoing', 'published', ?, ?, ?, 1, ?)
        returning id`,
      )
      .get(
        accessibilityFixtureSlugs.project,
        "开放科学智能平台",
        "建设可验证、可复用的科学智能研究平台。",
        richTextFixture,
        "2025-01",
        "示例科研计划",
        "https://example.com/project",
        now,
      ) as { id: number };
    const publication = sqlite
      .prepare(
        `insert into publications (
          title, authors, year, publication_type, venue, doi, external_url,
          abstract, status, featured, published_at
        ) values (?, ?, 2026, 'journal', ?, ?, ?, ?, 'published', 1, ?)
        returning id`,
      )
      .get(
        "面向科学发现的可信机器学习方法",
        "王教授, 李同学",
        "开放科学示例期刊",
        fixtureDoi,
        "https://example.com/publication",
        "用于验证公开成果列表的示例摘要。",
        now,
      ) as { id: number };
    sqlite
      .prepare(
        `insert into news_posts (
          slug, title, summary, content_json, status, featured, published_at
        ) values (?, ?, ?, ?, 'published', 1, ?)`,
      )
      .run(
        accessibilityFixtureSlugs.news,
        "实验室举办开放科学研讨会",
        "团队围绕研究复现和开放协作开展交流。",
        richTextFixture,
        now,
      );

    sqlite
      .prepare(
        "insert into project_members (project_id, member_id) values (?, ?)",
      )
      .run(project.id, member.id);
    sqlite
      .prepare(
        "insert into project_research_areas (project_id, research_area_id) values (?, ?)",
      )
      .run(project.id, area.id);
    sqlite
      .prepare(
        "insert into publication_members (publication_id, member_id) values (?, ?)",
      )
      .run(publication.id, member.id);
    sqlite
      .prepare(
        "insert into publication_projects (publication_id, project_id) values (?, ?)",
      )
      .run(publication.id, project.id);
    sqlite
      .prepare(
        "insert into publication_research_areas (publication_id, research_area_id) values (?, ?)",
      )
      .run(publication.id, area.id);
  })();
}
