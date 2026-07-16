import Link from "next/link";

import type { PublicSiteSettings } from "@/server/services/public";

const footerNavigation = [
  { href: "/about", label: "关于我们" },
  { href: "/research", label: "研究方向" },
  { href: "/people", label: "团队成员" },
  { href: "/projects", label: "科研项目" },
  { href: "/publications", label: "研究成果" },
  { href: "/news", label: "实验室动态" },
];

export function SiteFooter({ settings }: { settings: PublicSiteSettings }) {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-container footer-main">
        <div>
          <div className="footer-brand">{settings.siteName}</div>
          {(settings.description || settings.tagline) && (
            <p className="footer-copy">
              {settings.description || settings.tagline}
            </p>
          )}
        </div>

        <div>
          <h2 className="footer-title">快速导航</h2>
          <ul className="footer-list">
            {footerNavigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="footer-title">联系我们</h2>
          <ul className="footer-list">
            {settings.contactEmail && (
              <li>
                <a href={`mailto:${settings.contactEmail}`}>
                  {settings.contactEmail}
                </a>
              </li>
            )}
            {settings.contactPhone && <li>{settings.contactPhone}</li>}
            {settings.address && <li>{settings.address}</li>}
            <li>
              <Link href="/contact">查看联系信息</Link>
            </li>
            {settings.socialLinks.map((item) => (
              <li key={`${item.label}-${item.url}`}>
                <a href={item.url} rel="noreferrer" target="_blank">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="site-container footer-bottom">
        <span>
          © {year} {settings.siteName}
        </span>
        <span>{settings.footerText || "严谨求真，开放协作。"}</span>
      </div>
    </footer>
  );
}
