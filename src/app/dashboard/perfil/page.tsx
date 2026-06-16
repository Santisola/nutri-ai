import { redirect } from "next/navigation";
import { Flame, Beef, Wheat, Droplet, type LucideIcon } from "lucide-react";
import { getCurrentUserId, getProfile } from "@/lib/queries";
import ProfileForm from "@/components/ProfileForm";
import { updateProfile } from "./actions";
import { getEffectiveTargets } from "@/lib/nutrition/targets-effective";

export default async function PerfilPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const profile = await getProfile(userId);
  if (!profile) redirect("/onboarding");

  const targets = (await getEffectiveTargets(userId))!;
  const imported = targets.source === "imported";

  return (
    <div className="mx-auto h-full max-w-2xl space-y-6 overflow-y-auto px-5 py-6">
      <header>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Tu perfil
        </h1>
        <p className="text-sm text-zinc-500">
          Editá tus datos, objetivo y preferencias.
          {imported
            ? " Tu objetivo activo viene de tu plan importado."
            : " Tu objetivo diario se recalcula automáticamente."}
        </p>
      </header>

      {/* Objetivo actual */}
      <section className="grid grid-cols-4 gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Stat icon={Flame} label="Calorías" value={`${targets.kcal}`} unit="kcal" highlight />
        <Stat icon={Beef} label="Proteína" value={`${targets.protein}`} unit="g" />
        <Stat icon={Wheat} label="Carbos" value={`${targets.carb}`} unit="g" />
        <Stat icon={Droplet} label="Grasas" value={`${targets.fat}`} unit="g" />
      </section>

      {imported && (
        <p className="-mt-3 text-xs text-amber-600">
          Objetivo según tu plan importado. Si querés volver al cálculo
          automático, regenerá tu plan desde la sección Plan.
        </p>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <ProfileForm
          action={updateProfile}
          submitLabel="Guardar cambios"
          successMessage="Cambios guardados"
          defaults={{
            sex: profile.sex,
            birthYear: profile.birthYear,
            heightCm: profile.heightCm,
            weightKg: profile.weightKg,
            activityLevel: profile.activityLevel,
            goalType: profile.goalType,
            goalRateKgPerWeek: profile.goalRateKgPerWeek,
            targetWeightKg: profile.targetWeightKg,
            dietaryPrefs: profile.dietaryPrefs ?? [],
            allergies: profile.allergies ?? [],
            dislikes: profile.dislikes ?? [],
          }}
        />
      </section>

      <p className="text-xs text-zinc-400">
        Objetivo basado en Mifflin-St Jeor. No reemplaza el consejo de un
        profesional de la salud.
      </p>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p
        className={`text-lg font-bold ${
          highlight ? "text-emerald-600" : "text-zinc-900 dark:text-zinc-100"
        }`}
      >
        {value}
        <span className="ml-0.5 text-xs font-normal text-zinc-400">{unit}</span>
      </p>
    </div>
  );
}
