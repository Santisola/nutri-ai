import { redirect } from "next/navigation";
import { getCurrentUserId, getProfile } from "@/lib/queries";
import { signOut } from "@/auth";
import { TopNav, BottomNav } from "./Nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const profile = await getProfile(userId);
  if (!profile) redirect("/onboarding");

  return (
    <div className="flex h-[100dvh] flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="shrink-0 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-5">
          <span className="text-lg font-bold tracking-tight text-emerald-600">
            NutriAI
          </span>
          <TopNav />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="text-sm text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200">
              Salir
            </button>
          </form>
        </div>
      </header>

      {/* El main no scrollea: cada página maneja su propio scroll interno. */}
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>

      <BottomNav />
    </div>
  );
}
