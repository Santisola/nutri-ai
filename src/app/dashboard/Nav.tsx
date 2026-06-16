"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Apple,
  ClipboardList,
  MessageCircle,
  User,
  type LucideIcon,
} from "lucide-react";
import PhotoFab from "./PhotoFab";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Hoy", icon: Apple },
  { href: "/dashboard/plan", label: "Plan", icon: ClipboardList },
  { href: "/dashboard/chat", label: "Chat", icon: MessageCircle },
  { href: "/dashboard/perfil", label: "Perfil", icon: User },
];

function useActive() {
  const path = usePathname();
  return (href: string) =>
    href === "/dashboard" ? path === href : path.startsWith(href);
}

export function TopNav() {
  const isActive = useActive();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            isActive(t.href)
              ? "bg-emerald-600 text-white"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

function BottomTab({
  tab,
  active,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
        active ? "text-emerald-600" : "text-zinc-500 dark:text-zinc-400"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
      {tab.label}
    </Link>
  );
}

export function BottomNav() {
  const isActive = useActive();
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);
  return (
    <nav className="relative flex shrink-0 border-t border-zinc-200 bg-white md:hidden dark:border-zinc-800 dark:bg-zinc-950">
      {left.map((t) => (
        <BottomTab key={t.href} tab={t} active={isActive(t.href)} />
      ))}
      <PhotoFab />
      {right.map((t) => (
        <BottomTab key={t.href} tab={t} active={isActive(t.href)} />
      ))}
    </nav>
  );
}
