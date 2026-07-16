import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSiteSettings } from "@/server/services/public";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: {
      default: settings.seoTitle || settings.siteName,
      template: `%s · ${settings.siteName}`,
    },
    description:
      settings.seoDescription || settings.description || settings.tagline,
    openGraph: {
      type: "website",
      locale: "zh_CN",
      siteName: settings.siteName,
      title: settings.seoTitle || settings.siteName,
      description:
        settings.seoDescription ||
        settings.description ||
        settings.tagline ||
        undefined,
    },
  };
}

export default async function SiteLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const settings = await getSiteSettings();

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <SiteHeader logoUrl={settings.logoUrl} siteName={settings.siteName} />
      <main className="site-main" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
