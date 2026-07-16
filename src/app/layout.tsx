import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { getSiteOrigin } from "@/server/config/site-url";

import "./globals.css";

function getMetadataBase() {
  return new URL(getSiteOrigin());
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "科研实验室",
    template: "%s · 科研实验室",
  },
  description: "面向前沿问题开展严谨、开放、协作的科学研究。",
  applicationName: "科研实验室主页与管理系统",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f8f5ed",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
