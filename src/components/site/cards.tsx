import { ArrowUpRight, FileText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type {
  PublicMember,
  PublicNewsPost,
  PublicProject,
  PublicPublication,
  PublicResearchArea,
} from "@/server/services/public";

function CardImage({
  alt,
  className = "card-image",
  src,
}: {
  alt: string;
  className?: string;
  src: string | null;
}) {
  if (!src)
    return (
      <div aria-hidden="true" className={`${className} image-placeholder`} />
    );

  return (
    <Image
      alt={alt}
      className={className}
      height={720}
      sizes="(max-width: 640px) 35vw, (max-width: 960px) 50vw, 33vw"
      src={src}
      width={1280}
    />
  );
}

export function ResearchCard({ area }: { area: PublicResearchArea }) {
  return (
    <article className="card">
      <Link className="card-link" href={`/research/${area.slug}`}>
        <CardImage alt={area.title} src={area.coverUrl} />
        <div className="card-body">
          <h2 className="card-title">{area.title}</h2>
          {area.summary && <p className="card-summary">{area.summary}</p>}
        </div>
      </Link>
    </article>
  );
}

export function PersonCard({ member }: { member: PublicMember }) {
  return (
    <article className="card person-card">
      <Link className="card-link" href={`/people/${member.slug}`}>
        <CardImage
          alt={`${member.name}的照片`}
          className={
            member.avatarUrl
              ? "person-image"
              : "person-placeholder image-placeholder"
          }
          src={member.avatarUrl}
        />
        <div className="card-body">
          <h2 className="card-title">{member.name}</h2>
          {member.roleTitle && (
            <p className="person-role">{member.roleTitle}</p>
          )}
        </div>
      </Link>
    </article>
  );
}

export function ProjectCard({ project }: { project: PublicProject }) {
  return (
    <article className="card">
      <Link className="card-link" href={`/projects/${project.slug}`}>
        <CardImage alt={project.title} src={project.coverUrl} />
        <div className="card-body">
          <div className="badge-list">
            <span className="badge">
              {project.projectStatus === "ongoing" ? "进行中" : "已完成"}
            </span>
          </div>
          <h2 className="card-title" style={{ marginTop: "0.75rem" }}>
            {project.title}
          </h2>
          {project.summary && <p className="card-summary">{project.summary}</p>}
          {(project.startDate || project.endDate) && (
            <div className="card-meta">
              <span>
                {[project.startDate, project.endDate]
                  .filter(Boolean)
                  .join(" — ")}
              </span>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}

export function NewsCard({ post }: { post: PublicNewsPost }) {
  return (
    <article className="card">
      <Link className="card-link" href={`/news/${post.slug}`}>
        <CardImage alt={post.title} src={post.coverUrl} />
        <div className="card-body">
          {post.publishedAt && (
            <div className="card-meta" style={{ marginTop: 0 }}>
              {post.publishedAt}
            </div>
          )}
          <h2 className="card-title" style={{ marginTop: "0.45rem" }}>
            {post.title}
          </h2>
          {post.summary && <p className="card-summary">{post.summary}</p>}
        </div>
      </Link>
    </article>
  );
}

export function PublicationItem({
  publication,
}: {
  publication: PublicPublication;
}) {
  const volumeAndIssue = publication.volume
    ? `${publication.volume}${publication.issue ? `(${publication.issue})` : ""}`
    : publication.issue
      ? `(${publication.issue})`
      : null;
  const source = [
    publication.venue,
    volumeAndIssue,
    publication.pages ? `页码 ${publication.pages}` : null,
    publication.typeLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="publication-item">
      <div className="publication-year">{publication.year}</div>
      <div>
        <h2 className="publication-title">{publication.title}</h2>
        <p className="publication-authors">{publication.authors}</p>
        {source && <p className="publication-venue">{source}</p>}
        <div className="publication-links">
          {publication.doi && (
            <a
              href={`https://doi.org/${publication.doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")}`}
              rel="noreferrer"
              target="_blank"
            >
              DOI <ArrowUpRight aria-hidden="true" size={13} />
            </a>
          )}
          {publication.externalUrl && (
            <a href={publication.externalUrl} rel="noreferrer" target="_blank">
              访问成果 <ArrowUpRight aria-hidden="true" size={13} />
            </a>
          )}
          {publication.pdfUrl && (
            <a href={publication.pdfUrl} rel="noreferrer" target="_blank">
              PDF <FileText aria-hidden="true" size={13} />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
