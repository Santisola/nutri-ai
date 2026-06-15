"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Apple, MessageCircle, User, type LucideIcon } from "lucide-react";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Hoy", icon: Apple },
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

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
      {TABS.map((t) => {
        const active = isActive(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
              active
                ? "text-emerald-600"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
