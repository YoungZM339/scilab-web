"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/about", label: "关于我们" },
  { href: "/research", label: "研究方向" },
  { href: "/people", label: "团队成员" },
  { href: "/projects", label: "科研项目" },
  { href: "/publications", label: "研究成果" },
  { href: "/news", label: "动态" },
  { href: "/join", label: "加入我们" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({
  logoUrl,
  siteName,
}: {
  logoUrl: string | null;
  siteName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <Link className="brand" href="/" aria-label={`${siteName}首页`}>
          {logoUrl ? (
            <Image
              alt=""
              className="brand-logo"
              height={48}
              priority
              src={logoUrl}
              width={48}
            />
          ) : (
            <span className="brand-mark" aria-hidden="true">
              <span className="brand-mark-dot" />
            </span>
          )}
          <span className="brand-name">{siteName}</span>
        </Link>

        <nav className="desktop-nav" aria-label="主导航">
          {navigation.map((item) => (
            <Link
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className="nav-link"
              data-active={isActive(pathname, item.href)}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Dialog.Root onOpenChange={setOpen} open={open}>
          <Dialog.Trigger asChild>
            <button
              aria-label="打开导航菜单"
              className="mobile-menu-button"
              type="button"
            >
              <Menu aria-hidden="true" size={20} />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="mobile-overlay" />
            <Dialog.Content
              aria-describedby={undefined}
              className="mobile-drawer"
            >
              <div className="mobile-drawer-header">
                <Dialog.Title className="mobile-drawer-title">
                  导航
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    aria-label="关闭导航菜单"
                    className="mobile-menu-button mobile-close-button"
                    type="button"
                  >
                    <X aria-hidden="true" size={20} />
                  </button>
                </Dialog.Close>
              </div>
              <nav className="mobile-nav" aria-label="移动端主导航">
                {navigation.map((item) => (
                  <Link
                    aria-current={
                      isActive(pathname, item.href) ? "page" : undefined
                    }
                    className="nav-link"
                    data-active={isActive(pathname, item.href)}
                    href={item.href}
                    key={item.href}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  );
}
