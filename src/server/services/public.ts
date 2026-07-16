import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import {
  MEMBER_GROUPS,
  PUBLICATION_TYPES,
  PUBLICATION_TYPE_LABELS,
  type MemberGroup,
  type ProjectStatus,
  type PublicationType,
  type StaticPageKey,
} from "@/lib/constants";
import { renderRichText } from "@/lib/rich-text";
import { isSafeSlug } from "@/lib/slug";
import { formatDate } from "@/lib/utils";
import { db } from "@/server/db";
import {
  members,
  newsPosts,
  pages,
  projectMembers,
  projectResearchAreas,
  projects,
  publicationMembers,
  publicationProjects,
  publicationResearchAreas,
  publications,
  researchAreas,
  siteSettings,
  type Member,
  type NewsPost,
  type Page,
  type Project,
  type Publication,
  type ResearchArea,
} from "@/server/db/schema";

export const PUBLIC_CACHE_TAGS = {
  settings: "site-settings",
  pages: "pages",
  members: "members",
  researchAreas: "research-areas",
  projects: "projects",
  publications: "publications",
  news: "news",
} as const;

const CACHE_SECONDS = 60 * 60;

export interface PublicSocialLink {
  label: string;
  url: string;
}

export interface PublicSiteSettings {
  siteName: string;
  tagline: string | null;
  description: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  socialLinks: PublicSocialLink[];
  footerText: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface PublicStaticPage {
  id: number;
  key: StaticPageKey;
  slug: string;
  title: string;
  summary: string | null;
  html: string;
  publishedAt: string;
}

export interface PublicMember {
  id: number;
  slug: string;
  name: string;
  roleTitle: string | null;
  group: MemberGroup;
  email: string | null;
  phone: string | null;
  website: string | null;
  orcid: string | null;
  bioHtml: string;
  avatarUrl: string | null;
  featured: boolean;
  projects: PublicProject[];
  publications: PublicPublication[];
}

export interface PublicResearchArea {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  html: string;
  coverUrl: string | null;
  featured: boolean;
  projects: PublicProject[];
  publications: PublicPublication[];
}

export interface PublicProject {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  html: string;
  projectStatus: ProjectStatus;
  coverUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  funding: string | null;
  externalUrl: string | null;
  featured: boolean;
  members: PublicMember[];
  researchAreas: PublicResearchArea[];
  publications: PublicPublication[];
}

export interface PublicPublication {
  id: number;
  title: string;
  authors: string;
  year: number;
  type: PublicationType;
  typeLabel: string;
  venue: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  externalUrl: string | null;
  pdfUrl: string | null;
  abstract: string | null;
  featured: boolean;
}

export interface PublicNewsPost {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  html: string;
  coverUrl: string | null;
  featured: boolean;
  publishedAt: string;
}

export interface PublicationQuery {
  year?: number;
  type?: PublicationType;
  researchAreaSlug?: string;
}

export interface SitemapEntry {
  path: string;
  lastModified: Date;
}

function mediaUrl(id: number | null): string | null {
  return id ? `/api/media/${id}` : null;
}

function safeWebUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizeRouteSlug(value: string): string {
  try {
    return decodeURIComponent(value).normalize("NFKC");
  } catch {
    return value.normalize("NFKC");
  }
}

function validatedRouteSlug(value: string): string | null {
  const normalized = normalizeRouteSlug(value);
  return normalized.length <= 160 && isSafeSlug(normalized) ? normalized : null;
}

const getPublishedSlugIndex = unstable_cache(
  async () => {
    const [memberRows, areaRows, projectRows, newsRows] = await Promise.all([
      db
        .select({ slug: members.slug })
        .from(members)
        .where(eq(members.status, "published")),
      db
        .select({ slug: researchAreas.slug })
        .from(researchAreas)
        .where(eq(researchAreas.status, "published")),
      db
        .select({ slug: projects.slug })
        .from(projects)
        .where(eq(projects.status, "published")),
      db
        .select({ slug: newsPosts.slug })
        .from(newsPosts)
        .where(eq(newsPosts.status, "published")),
    ]);

    return {
      members: memberRows.map((row) => row.slug),
      researchAreas: areaRows.map((row) => row.slug),
      projects: projectRows.map((row) => row.slug),
      news: newsRows.map((row) => row.slug),
    };
  },
  ["public-published-slug-index"],
  {
    revalidate: CACHE_SECONDS,
    tags: [
      PUBLIC_CACHE_TAGS.members,
      PUBLIC_CACHE_TAGS.researchAreas,
      PUBLIC_CACHE_TAGS.projects,
      PUBLIC_CACHE_TAGS.news,
    ],
  },
);

function toStaticPage(row: Page): PublicStaticPage {
  return {
    id: row.id,
    key: row.key,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    html: renderRichText(row.contentJson),
    publishedAt: formatDate(row.publishedAt),
  };
}

function toMember(row: Member): PublicMember {
  const group = MEMBER_GROUPS.includes(row.group as MemberGroup)
    ? (row.group as MemberGroup)
    : "student";

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    roleTitle: row.roleTitle,
    group,
    email: row.email,
    phone: row.phone,
    website: safeWebUrl(row.website),
    orcid: row.orcid,
    bioHtml: renderRichText(row.bioJson),
    avatarUrl: mediaUrl(row.avatarMediaId),
    featured: row.featured,
    projects: [],
    publications: [],
  };
}

function toResearchArea(row: ResearchArea): PublicResearchArea {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    html: renderRichText(row.contentJson),
    coverUrl: mediaUrl(row.coverMediaId),
    featured: row.featured,
    projects: [],
    publications: [],
  };
}

function toProject(row: Project): PublicProject {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    html: renderRichText(row.contentJson),
    projectStatus: row.projectStatus,
    coverUrl: mediaUrl(row.coverMediaId),
    startDate: row.startDate,
    endDate: row.endDate,
    funding: row.funding,
    externalUrl: safeWebUrl(row.externalUrl),
    featured: row.featured,
    members: [],
    researchAreas: [],
    publications: [],
  };
}

function toPublication(row: Publication): PublicPublication {
  return {
    id: row.id,
    title: row.title,
    authors: row.authors,
    year: row.year,
    type: row.type,
    typeLabel: PUBLICATION_TYPE_LABELS[row.type],
    venue: row.venue,
    volume: row.volume,
    issue: row.issue,
    pages: row.pages,
    doi: row.doi,
    externalUrl: safeWebUrl(row.externalUrl),
    pdfUrl: mediaUrl(row.pdfMediaId),
    abstract: row.abstract,
    featured: row.featured,
  };
}

function toNewsPost(row: NewsPost): PublicNewsPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    html: renderRichText(row.contentJson),
    coverUrl: mediaUrl(row.coverMediaId),
    featured: row.featured,
    publishedAt: formatDate(row.publishedAt),
  };
}

const getCachedSiteSettings = unstable_cache(
  async (): Promise<PublicSiteSettings> => {
    const row = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, 1))
      .limit(1)
      .then((rows) => rows[0]);

    if (!row) {
      return {
        siteName: "科研实验室",
        tagline: null,
        description: null,
        heroTitle: null,
        heroSubtitle: null,
        heroImageUrl: null,
        logoUrl: null,
        contactEmail: null,
        contactPhone: null,
        address: null,
        socialLinks: [],
        footerText: null,
        seoTitle: null,
        seoDescription: null,
      };
    }

    return {
      siteName: row.siteName,
      tagline: row.tagline,
      description: row.description,
      heroTitle: row.heroTitle,
      heroSubtitle: row.heroSubtitle,
      heroImageUrl: mediaUrl(row.heroImageId),
      logoUrl: mediaUrl(row.logoImageId),
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
      address: row.address,
      socialLinks: (row.socialLinksJson ?? [])
        .filter((item) => item && typeof item.label === "string")
        .map((item) => ({ label: item.label, url: safeWebUrl(item.url) }))
        .filter((item): item is PublicSocialLink => Boolean(item.url)),
      footerText: row.footerText,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
    };
  },
  ["public-site-settings"],
  { revalidate: CACHE_SECONDS, tags: [PUBLIC_CACHE_TAGS.settings] },
);

export function getSiteSettings() {
  return getCachedSiteSettings();
}

export const getStaticPage = unstable_cache(
  async (key: StaticPageKey): Promise<PublicStaticPage | null> => {
    const row = await db
      .select()
      .from(pages)
      .where(and(eq(pages.key, key), eq(pages.status, "published")))
      .limit(1)
      .then((rows) => rows[0]);

    return row ? toStaticPage(row) : null;
  },
  ["public-static-page"],
  { revalidate: CACHE_SECONDS, tags: [PUBLIC_CACHE_TAGS.pages] },
);

export const getMembers = unstable_cache(
  async (): Promise<PublicMember[]> => {
    const rows = await db
      .select()
      .from(members)
      .where(eq(members.status, "published"))
      .orderBy(asc(members.sortOrder), asc(members.name));
    return rows.map(toMember);
  },
  ["public-members"],
  { revalidate: CACHE_SECONDS, tags: [PUBLIC_CACHE_TAGS.members] },
);

const getMemberBySlugCached = unstable_cache(
  async (slug: string): Promise<PublicMember | null> => {
    const normalizedSlug = normalizeRouteSlug(slug);
    const row = await db
      .select()
      .from(members)
      .where(
        and(eq(members.slug, normalizedSlug), eq(members.status, "published")),
      )
      .limit(1)
      .then((rows) => rows[0]);
    if (!row) return null;

    const [projectLinks, publicationLinks] = await Promise.all([
      db
        .select({ id: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.memberId, row.id))
        .orderBy(asc(projectMembers.sortOrder)),
      db
        .select({ id: publicationMembers.publicationId })
        .from(publicationMembers)
        .where(eq(publicationMembers.memberId, row.id))
        .orderBy(asc(publicationMembers.sortOrder)),
    ]);

    const [projectRows, publicationRows] = await Promise.all([
      projectLinks.length
        ? db
            .select()
            .from(projects)
            .where(
              and(
                eq(projects.status, "published"),
                inArray(
                  projects.id,
                  projectLinks.map((item) => item.id),
                ),
              ),
            )
            .orderBy(asc(projects.sortOrder), desc(projects.publishedAt))
        : Promise.resolve([]),
      publicationLinks.length
        ? db
            .select()
            .from(publications)
            .where(
              and(
                eq(publications.status, "published"),
                inArray(
                  publications.id,
                  publicationLinks.map((item) => item.id),
                ),
              ),
            )
            .orderBy(desc(publications.year), asc(publications.sortOrder))
        : Promise.resolve([]),
    ]);

    return {
      ...toMember(row),
      projects: projectRows.map(toProject),
      publications: publicationRows.map(toPublication),
    };
  },
  ["public-member-detail"],
  {
    revalidate: CACHE_SECONDS,
    tags: [
      PUBLIC_CACHE_TAGS.members,
      PUBLIC_CACHE_TAGS.projects,
      PUBLIC_CACHE_TAGS.publications,
    ],
  },
);

export async function getMemberBySlug(slug: string) {
  const normalized = validatedRouteSlug(slug);
  if (!normalized) return null;
  const index = await getPublishedSlugIndex();
  if (!index.members.includes(normalized)) return null;
  return getMemberBySlugCached(normalized);
}

export const getResearchAreas = unstable_cache(
  async (): Promise<PublicResearchArea[]> => {
    const rows = await db
      .select()
      .from(researchAreas)
      .where(eq(researchAreas.status, "published"))
      .orderBy(asc(researchAreas.sortOrder), asc(researchAreas.title));
    return rows.map(toResearchArea);
  },
  ["public-research-areas"],
  { revalidate: CACHE_SECONDS, tags: [PUBLIC_CACHE_TAGS.researchAreas] },
);

const getResearchAreaBySlugCached = unstable_cache(
  async (slug: string): Promise<PublicResearchArea | null> => {
    const normalizedSlug = normalizeRouteSlug(slug);
    const row = await db
      .select()
      .from(researchAreas)
      .where(
        and(
          eq(researchAreas.slug, normalizedSlug),
          eq(researchAreas.status, "published"),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);
    if (!row) return null;

    const [projectLinks, publicationLinks] = await Promise.all([
      db
        .select({ id: projectResearchAreas.projectId })
        .from(projectResearchAreas)
        .where(eq(projectResearchAreas.researchAreaId, row.id))
        .orderBy(asc(projectResearchAreas.sortOrder)),
      db
        .select({ id: publicationResearchAreas.publicationId })
        .from(publicationResearchAreas)
        .where(eq(publicationResearchAreas.researchAreaId, row.id))
        .orderBy(asc(publicationResearchAreas.sortOrder)),
    ]);

    const [projectRows, publicationRows] = await Promise.all([
      projectLinks.length
        ? db
            .select()
            .from(projects)
            .where(
              and(
                eq(projects.status, "published"),
                inArray(
                  projects.id,
                  projectLinks.map((item) => item.id),
                ),
              ),
            )
            .orderBy(asc(projects.sortOrder), desc(projects.publishedAt))
        : Promise.resolve([]),
      publicationLinks.length
        ? db
            .select()
            .from(publications)
            .where(
              and(
                eq(publications.status, "published"),
                inArray(
                  publications.id,
                  publicationLinks.map((item) => item.id),
                ),
              ),
            )
            .orderBy(desc(publications.year), asc(publications.sortOrder))
        : Promise.resolve([]),
    ]);

    return {
      ...toResearchArea(row),
      projects: projectRows.map(toProject),
      publications: publicationRows.map(toPublication),
    };
  },
  ["public-research-area-detail"],
  {
    revalidate: CACHE_SECONDS,
    tags: [
      PUBLIC_CACHE_TAGS.researchAreas,
      PUBLIC_CACHE_TAGS.projects,
      PUBLIC_CACHE_TAGS.publications,
    ],
  },
);

export async function getResearchAreaBySlug(slug: string) {
  const normalized = validatedRouteSlug(slug);
  if (!normalized) return null;
  const index = await getPublishedSlugIndex();
  if (!index.researchAreas.includes(normalized)) return null;
  return getResearchAreaBySlugCached(normalized);
}

export const getProjects = unstable_cache(
  async (): Promise<PublicProject[]> => {
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.status, "published"))
      .orderBy(
        desc(projects.projectStatus),
        asc(projects.sortOrder),
        desc(projects.publishedAt),
      );
    return rows.map(toProject);
  },
  ["public-projects"],
  { revalidate: CACHE_SECONDS, tags: [PUBLIC_CACHE_TAGS.projects] },
);

const getProjectBySlugCached = unstable_cache(
  async (slug: string): Promise<PublicProject | null> => {
    const normalizedSlug = normalizeRouteSlug(slug);
    const row = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.slug, normalizedSlug),
          eq(projects.status, "published"),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);
    if (!row) return null;

    const [memberLinks, areaLinks, publicationLinks] = await Promise.all([
      db
        .select({ id: projectMembers.memberId })
        .from(projectMembers)
        .where(eq(projectMembers.projectId, row.id))
        .orderBy(asc(projectMembers.sortOrder)),
      db
        .select({ id: projectResearchAreas.researchAreaId })
        .from(projectResearchAreas)
        .where(eq(projectResearchAreas.projectId, row.id))
        .orderBy(asc(projectResearchAreas.sortOrder)),
      db
        .select({ id: publicationProjects.publicationId })
        .from(publicationProjects)
        .where(eq(publicationProjects.projectId, row.id))
        .orderBy(asc(publicationProjects.sortOrder)),
    ]);

    const [memberRows, areaRows, publicationRows] = await Promise.all([
      memberLinks.length
        ? db
            .select()
            .from(members)
            .where(
              and(
                eq(members.status, "published"),
                inArray(
                  members.id,
                  memberLinks.map((item) => item.id),
                ),
              ),
            )
            .orderBy(asc(members.sortOrder), asc(members.name))
        : Promise.resolve([]),
      areaLinks.length
        ? db
            .select()
            .from(researchAreas)
            .where(
              and(
                eq(researchAreas.status, "published"),
                inArray(
                  researchAreas.id,
                  areaLinks.map((item) => item.id),
                ),
              ),
            )
            .orderBy(asc(researchAreas.sortOrder), asc(researchAreas.title))
        : Promise.resolve([]),
      publicationLinks.length
        ? db
            .select()
            .from(publications)
            .where(
              and(
                eq(publications.status, "published"),
                inArray(
                  publications.id,
                  publicationLinks.map((item) => item.id),
                ),
              ),
            )
            .orderBy(desc(publications.year), asc(publications.sortOrder))
        : Promise.resolve([]),
    ]);

    return {
      ...toProject(row),
      members: memberRows.map(toMember),
      researchAreas: areaRows.map(toResearchArea),
      publications: publicationRows.map(toPublication),
    };
  },
  ["public-project-detail"],
  {
    revalidate: CACHE_SECONDS,
    tags: [
      PUBLIC_CACHE_TAGS.projects,
      PUBLIC_CACHE_TAGS.members,
      PUBLIC_CACHE_TAGS.researchAreas,
      PUBLIC_CACHE_TAGS.publications,
    ],
  },
);

export async function getProjectBySlug(slug: string) {
  const normalized = validatedRouteSlug(slug);
  if (!normalized) return null;
  const index = await getPublishedSlugIndex();
  if (!index.projects.includes(normalized)) return null;
  return getProjectBySlugCached(normalized);
}

const getPublicationsCached = unstable_cache(
  async (query: PublicationQuery = {}): Promise<PublicPublication[]> => {
    const conditions = [eq(publications.status, "published")];
    if (query.year) conditions.push(eq(publications.year, query.year));
    if (query.type) conditions.push(eq(publications.type, query.type));

    if (query.researchAreaSlug) {
      const normalizedAreaSlug = normalizeRouteSlug(query.researchAreaSlug);
      const area = await db
        .select({ id: researchAreas.id })
        .from(researchAreas)
        .where(
          and(
            eq(researchAreas.slug, normalizedAreaSlug),
            eq(researchAreas.status, "published"),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);
      if (!area) return [];

      const links = await db
        .select({ id: publicationResearchAreas.publicationId })
        .from(publicationResearchAreas)
        .where(eq(publicationResearchAreas.researchAreaId, area.id));
      if (links.length === 0) return [];
      conditions.push(
        inArray(
          publications.id,
          links.map((item) => item.id),
        ),
      );
    }

    const rows = await db
      .select()
      .from(publications)
      .where(and(...conditions))
      .orderBy(
        desc(publications.year),
        asc(publications.sortOrder),
        desc(publications.publishedAt),
      );
    return rows.map(toPublication);
  },
  ["public-publications"],
  {
    revalidate: CACHE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.publications, PUBLIC_CACHE_TAGS.researchAreas],
  },
);

export async function getPublications(query: PublicationQuery = {}) {
  if (
    query.year !== undefined &&
    (!Number.isInteger(query.year) || query.year < 1900 || query.year > 2200)
  ) {
    return [];
  }
  if (query.type !== undefined && !PUBLICATION_TYPES.includes(query.type)) {
    return [];
  }

  const filters = await getPublicationFilters();
  if (query.year !== undefined && !filters.years.includes(query.year))
    return [];

  let researchAreaSlug: string | undefined;
  if (query.researchAreaSlug) {
    const normalized = validatedRouteSlug(query.researchAreaSlug);
    if (
      !normalized ||
      !filters.researchAreas.some((area) => area.slug === normalized)
    ) {
      return [];
    }
    researchAreaSlug = normalized;
  }

  return getPublicationsCached({
    ...(query.year === undefined ? {} : { year: query.year }),
    ...(query.type === undefined ? {} : { type: query.type }),
    ...(researchAreaSlug ? { researchAreaSlug } : {}),
  });
}

export const getPublicationFilters = unstable_cache(
  async () => {
    const [yearRows, areaRows] = await Promise.all([
      db
        .selectDistinct({ year: publications.year })
        .from(publications)
        .where(eq(publications.status, "published"))
        .orderBy(desc(publications.year)),
      db
        .select({
          id: researchAreas.id,
          slug: researchAreas.slug,
          title: researchAreas.title,
        })
        .from(researchAreas)
        .where(eq(researchAreas.status, "published"))
        .orderBy(asc(researchAreas.sortOrder), asc(researchAreas.title)),
    ]);

    return {
      years: yearRows.map((item) => item.year),
      researchAreas: areaRows,
    };
  },
  ["public-publication-filters"],
  {
    revalidate: CACHE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.publications, PUBLIC_CACHE_TAGS.researchAreas],
  },
);

export const getNewsPosts = unstable_cache(
  async (): Promise<PublicNewsPost[]> => {
    const rows = await db
      .select()
      .from(newsPosts)
      .where(eq(newsPosts.status, "published"))
      .orderBy(desc(newsPosts.publishedAt), asc(newsPosts.sortOrder));
    return rows.map(toNewsPost);
  },
  ["public-news-posts"],
  { revalidate: CACHE_SECONDS, tags: [PUBLIC_CACHE_TAGS.news] },
);

const getNewsPostBySlugCached = unstable_cache(
  async (slug: string): Promise<PublicNewsPost | null> => {
    const normalizedSlug = normalizeRouteSlug(slug);
    const row = await db
      .select()
      .from(newsPosts)
      .where(
        and(
          eq(newsPosts.slug, normalizedSlug),
          eq(newsPosts.status, "published"),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);
    return row ? toNewsPost(row) : null;
  },
  ["public-news-post-detail"],
  { revalidate: CACHE_SECONDS, tags: [PUBLIC_CACHE_TAGS.news] },
);

export async function getNewsPostBySlug(slug: string) {
  const normalized = validatedRouteSlug(slug);
  if (!normalized) return null;
  const index = await getPublishedSlugIndex();
  if (!index.news.includes(normalized)) return null;
  return getNewsPostBySlugCached(normalized);
}

const getHomeFeaturedContent = unstable_cache(
  async () => {
    const [areaRows, projectRows, memberRows, publicationRows, newsRows] =
      await Promise.all([
        db
          .select()
          .from(researchAreas)
          .where(
            and(
              eq(researchAreas.status, "published"),
              eq(researchAreas.featured, true),
            ),
          )
          .orderBy(asc(researchAreas.sortOrder))
          .limit(6),
        db
          .select()
          .from(projects)
          .where(
            and(eq(projects.status, "published"), eq(projects.featured, true)),
          )
          .orderBy(asc(projects.sortOrder), desc(projects.publishedAt))
          .limit(6),
        db
          .select()
          .from(members)
          .where(
            and(eq(members.status, "published"), eq(members.featured, true)),
          )
          .orderBy(asc(members.sortOrder), asc(members.name))
          .limit(8),
        db
          .select()
          .from(publications)
          .where(eq(publications.status, "published"))
          .orderBy(
            desc(publications.year),
            desc(publications.publishedAt),
            asc(publications.sortOrder),
          )
          .limit(5),
        db
          .select()
          .from(newsPosts)
          .where(eq(newsPosts.status, "published"))
          .orderBy(desc(newsPosts.publishedAt), asc(newsPosts.sortOrder))
          .limit(6),
      ]);

    return {
      researchAreas: areaRows.map(toResearchArea),
      projects: projectRows.map(toProject),
      members: memberRows.map(toMember),
      publications: publicationRows.map(toPublication),
      news: newsRows.map(toNewsPost),
    };
  },
  ["public-home-featured-content"],
  {
    revalidate: CACHE_SECONDS,
    tags: [
      PUBLIC_CACHE_TAGS.researchAreas,
      PUBLIC_CACHE_TAGS.projects,
      PUBLIC_CACHE_TAGS.members,
      PUBLIC_CACHE_TAGS.publications,
      PUBLIC_CACHE_TAGS.news,
    ],
  },
);

export async function getHomePageData() {
  const [settings, about, join, featured] = await Promise.all([
    getSiteSettings(),
    getStaticPage("about"),
    getStaticPage("join"),
    getHomeFeaturedContent(),
  ]);

  return { settings, about, join, ...featured };
}

export const getSitemapEntries = unstable_cache(
  async (): Promise<SitemapEntry[]> => {
    const [pageRows, memberRows, areaRows, projectRows, newsRows] =
      await Promise.all([
        db
          .select({ key: pages.key, updatedAt: pages.updatedAt })
          .from(pages)
          .where(eq(pages.status, "published")),
        db
          .select({ slug: members.slug, updatedAt: members.updatedAt })
          .from(members)
          .where(eq(members.status, "published")),
        db
          .select({
            slug: researchAreas.slug,
            updatedAt: researchAreas.updatedAt,
          })
          .from(researchAreas)
          .where(eq(researchAreas.status, "published")),
        db
          .select({ slug: projects.slug, updatedAt: projects.updatedAt })
          .from(projects)
          .where(eq(projects.status, "published")),
        db
          .select({ slug: newsPosts.slug, updatedAt: newsPosts.updatedAt })
          .from(newsPosts)
          .where(eq(newsPosts.status, "published")),
      ]);

    return [
      ...pageRows.map((item) => ({
        path: `/${item.key}`,
        lastModified: item.updatedAt,
      })),
      ...memberRows.map((item) => ({
        path: `/people/${item.slug}`,
        lastModified: item.updatedAt,
      })),
      ...areaRows.map((item) => ({
        path: `/research/${item.slug}`,
        lastModified: item.updatedAt,
      })),
      ...projectRows.map((item) => ({
        path: `/projects/${item.slug}`,
        lastModified: item.updatedAt,
      })),
      ...newsRows.map((item) => ({
        path: `/news/${item.slug}`,
        lastModified: item.updatedAt,
      })),
    ];
  },
  ["public-sitemap-entries"],
  {
    revalidate: CACHE_SECONDS,
    tags: [
      PUBLIC_CACHE_TAGS.members,
      PUBLIC_CACHE_TAGS.pages,
      PUBLIC_CACHE_TAGS.researchAreas,
      PUBLIC_CACHE_TAGS.projects,
      PUBLIC_CACHE_TAGS.news,
    ],
  },
);
