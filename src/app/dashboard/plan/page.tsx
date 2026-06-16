import { redirect } from "next/navigation";
import { getCurrentUserId, getProfile, getPlan } from "@/lib/queries";
import PlanView from "./PlanView";

export default async function PlanPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const profile = await getProfile(userId);
  if (!profile) redirect("/onboarding");

  const plan = await getPlan(userId);
  const updatedAt = plan
    ? new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(plan.updatedAt)
    : undefined;

  return (
    <div className="mx-auto h-full max-w-2xl space-y-4 overflow-y-auto px-5 py-6">
      <header>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Tu plan
        </h1>
        <p className="text-sm text-zinc-500">
          Una guía personalizada para alcanzar tu objetivo. Pedí cambios desde el
          chat cuando quieras.
        </p>
      </header>

      <PlanView initialContent={plan?.content ?? null} updatedAt={updatedAt} />
    </div>
  );
}
