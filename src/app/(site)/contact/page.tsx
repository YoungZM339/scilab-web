import { Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { RichText } from "@/components/site/rich-text";
import { getSiteSettings, getStaticPage } from "@/server/services/public";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getStaticPage("contact");
  return {
    title: page?.title || "联系我们",
    description: page?.summary || "查看实验室的邮箱、电话与地址。",
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const [page, settings] = await Promise.all([
    getStaticPage("contact"),
    getSiteSettings(),
  ]);
  const hasContactDetails = Boolean(
    settings.contactEmail || settings.contactPhone || settings.address,
  );

  return (
    <>
      <PageHero
        description={
          page?.summary ||
          "如有学术交流、合作或加入团队的意向，欢迎与我们联系。"
        }
        eyebrow="Contact"
        title={page?.title || "联系我们"}
      />
      <section className="content-section">
        <div className="site-container">
          {hasContactDetails ? (
            <div className="contact-grid">
              {settings.contactEmail && (
                <div className="contact-item">
                  <Mail
                    aria-hidden="true"
                    color="var(--accent-dark)"
                    size={24}
                  />
                  <h2>电子邮箱</h2>
                  <p>
                    <a href={`mailto:${settings.contactEmail}`}>
                      {settings.contactEmail}
                    </a>
                  </p>
                </div>
              )}
              {settings.contactPhone && (
                <div className="contact-item">
                  <Phone
                    aria-hidden="true"
                    color="var(--accent-dark)"
                    size={24}
                  />
                  <h2>联系电话</h2>
                  <p>{settings.contactPhone}</p>
                </div>
              )}
              {settings.address && (
                <div className="contact-item">
                  <MapPin
                    aria-hidden="true"
                    color="var(--accent-dark)"
                    size={24}
                  />
                  <h2>实验室地址</h2>
                  <p>{settings.address}</p>
                </div>
              )}
            </div>
          ) : (
            <EmptyState description="联系信息尚未发布。" />
          )}
        </div>
      </section>
      {page?.html && (
        <section className="section section-muted">
          <div className="narrow-container">
            <RichText html={page.html} />
          </div>
        </section>
      )}
    </>
  );
}
