export const PUBLISH_STATUSES = ["draft", "published"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const PROJECT_STATUSES = ["ongoing", "completed"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const MEMBER_GROUPS = [
  "principal_investigator",
  "faculty",
  "postdoc_researcher",
  "student",
  "alumni",
] as const;
export type MemberGroup = (typeof MEMBER_GROUPS)[number];

export const MEMBER_GROUP_LABELS: Record<MemberGroup, string> = {
  principal_investigator: "负责人",
  faculty: "教师",
  postdoc_researcher: "博士后 / 研究人员",
  student: "学生",
  alumni: "校友",
};

export const PUBLICATION_TYPES = [
  "journal",
  "conference",
  "book_chapter",
  "patent",
  "software",
  "other",
] as const;
export type PublicationType = (typeof PUBLICATION_TYPES)[number];

export const PUBLICATION_TYPE_LABELS: Record<PublicationType, string> = {
  journal: "期刊论文",
  conference: "会议论文",
  book_chapter: "专著章节",
  patent: "专利",
  software: "软件",
  other: "其他成果",
};

export const NEWS_CATEGORIES = ["news", "notice", "event"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  news: "新闻",
  notice: "通知",
  event: "学术活动",
};

export const STATIC_PAGE_KEYS = ["about", "join", "contact"] as const;
export type StaticPageKey = (typeof STATIC_PAGE_KEYS)[number];

export const STATIC_PAGE_LABELS: Record<StaticPageKey, string> = {
  about: "实验室介绍",
  join: "加入我们",
  contact: "联系我们",
};
