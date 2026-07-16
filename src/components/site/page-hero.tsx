import Link from "next/link";

interface BreadcrumbItem {
  href?: string;
  label: string;
}

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string | null;
  breadcrumbs?: BreadcrumbItem[];
}

export function PageHero({
  eyebrow,
  title,
  description,
  breadcrumbs,
}: PageHeroProps) {
  return (
    <section className="page-hero">
      <div className="site-container">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="面包屑导航">
            <ol className="breadcrumb">
              {breadcrumbs.map((item) => (
                <li key={`${item.href ?? "current"}-${item.label}`}>
                  {item.href ? (
                    <Link href={item.href}>{item.label}</Link>
                  ) : (
                    item.label
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
    </section>
  );
}
