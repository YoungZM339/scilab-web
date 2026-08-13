"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  ChevronRight,
  FileText,
  FlaskConical,
  FolderKanban,
  Images,
  LayoutTemplate,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Settings,
  UserRoundCog,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { signOutAction } from "@/server/actions/auth";

const navigation = [
  {
    label: "工作台",
    items: [
      { href: "/admin", label: "概览", icon: LayoutDashboard, exact: true },
      { href: "/admin/homepage", label: "主页管理", icon: LayoutTemplate },
    ],
  },
  {
    label: "内容管理",
    items: [
      { href: "/admin/news", label: "新闻动态", icon: Newspaper },
      { href: "/admin/research", label: "研究方向", icon: FlaskConical },
      { href: "/admin/projects", label: "科研项目", icon: FolderKanban },
      { href: "/admin/publications", label: "论文成果", icon: BookOpen },
      { href: "/admin/people", label: "团队成员", icon: Users },
      { href: "/admin/pages", label: "介绍页面", icon: FileText },
      { href: "/admin/media", label: "图片与文件", icon: Images },
    ],
  },
  {
    label: "系统",
    items: [
      { href: "/admin/settings", label: "网站信息", icon: Settings },
      { href: "/admin/account", label: "管理员账户", icon: UserRoundCog },
    ],
  },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white text-slate-700">
      <Link
        href="/admin"
        onClick={onNavigate}
        className="flex h-16 items-center gap-3 border-b border-slate-200 px-5"
      >
        <span className="grid size-9 place-items-center rounded-md bg-[#0052d9] text-white">
          <FlaskConical className="size-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-slate-950">
            实验室管理
          </span>
          <span className="block text-xs text-slate-400">网站内容管理</span>
        </span>
      </Link>
      <nav aria-label="后台导航" className="flex-1 overflow-y-auto px-3 py-4">
        {navigation.map((group) => (
          <div className="mb-5" key={group.label}>
            <p className="mb-1.5 px-3 text-xs font-medium text-slate-400">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-blue-50 font-medium text-[#0052d9]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    <span className="flex-1">{item.label}</span>
                    {active ? (
                      <ChevronRight aria-hidden="true" className="size-4" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <Link
          href="/"
          className="mb-1 flex items-center rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-950"
        >
          查看公开网站
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          >
            <LogOut aria-hidden="true" className="size-4" />
            退出登录
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-[#f5f7fa]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/50"
            aria-label="关闭导航"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-72 max-w-[85vw] shadow-2xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10"
              onClick={() => setOpen(false)}
              aria-label="关闭导航"
            >
              <X className="size-5" />
            </Button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-200 bg-white px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label="打开导航"
          >
            <Menu className="size-5" />
          </Button>
          <span className="ml-2 text-sm font-semibold text-slate-900">
            实验室管理
          </span>
        </div>
        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
