import { expect, test } from "@playwright/test";

const protectedPages = [
  ["/admin", "最近操作"],
  ["/admin/settings", "首页主视觉"],
  ["/admin/pages", "维护实验室介绍"],
  ["/admin/pages/1", "固定页面的访问路径"],
  ["/admin/people", "管理负责人、教师"],
  ["/admin/people/1", "已发布成员会出现在公开成员页面"],
  ["/admin/research", "维护实验室的核心研究主题"],
  ["/admin/research/1", "发布后会显示在研究方向列表"],
  ["/admin/projects", "管理项目进展、参与成员"],
  ["/admin/projects/1", "关联成员与研究方向后"],
  ["/admin/publications", "维护准确的作者字符串"],
  ["/admin/publications/1", "作者字段按论文署名原样保存"],
  ["/admin/news", "发布实验室新闻、通知"],
  ["/admin/news/1", "发布后会按发布时间显示"],
  ["/admin/media", "被内容引用的文件不能删除"],
  ["/admin/account", "系统仅允许一个管理员账户"],
] as const;

test("unauthenticated RSC requests cannot render admin page payloads", async ({
  request,
}) => {
  for (const [path, privateMarker] of protectedPages) {
    const response = await request.get(`${path}?_rsc=security-audit`, {
      headers: { RSC: "1" },
      maxRedirects: 0,
    });
    const payload = await response.text();

    expect(
      payload,
      `${path} must be stopped by an authentication boundary`,
    ).toMatch(/\/admin\/login|NEXT_REDIRECT|UNAUTHORIZED|需要管理员登录/);
    expect(
      payload,
      `${path} leaked its page component through RSC`,
    ).not.toContain(privateMarker);
  }
});
