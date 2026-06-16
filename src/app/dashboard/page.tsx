import { redirect } from "next/navigation";
import {
  getCurrentUserId,
  getProfile,
  getDayMeals,
  sumDay,
  getLatestWeight,
  getWeightHistory,
} from "@/lib/queries";
import { todayISO, formatDayLabel } from "@/lib/date";
import { getEffectiveTargets } from "@/lib/nutrition/targets-effective";
import { Beef, Wheat, Droplet, type LucideIcon } from "lucide-react";
import AddFood from "./AddFood";
import MealList from "./MealList";
import MealSuggestion from "./MealSuggestion";
import WeightForm from "./WeightForm";
import WeightChart from "./WeightChart";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const profile = await getProfile(userId);
  if (!profile) redirect("/onboarding");

  const today = todayISO();
  const [meals, latestWeight, weightHistory] = await Promise.all([
    getDayMeals(userId, today),
    getLatestWeight(userId),
    getWeightHistory(userId, 30),
  ]);
  // getWeightHistory viene desc (más nuevo primero) → a cronológico para el gráfico.
  const weightSeries = [...weightHistory]
    .reverse()
    .map((w) => ({ date: w.date, weight: w.weightKg }));
  const consumed = sumDay(meals);
  const currentWeight = latestWeight?.weightKg ?? profile.weightKg;

  const targets = (await getEffectiveTargets(userId))!;

  const remaining = Math.max(0, targets.kcal - consumed.kcal);
  const pct = Math.min(100, Math.round((consumed.kcal / targets.kcal) * 100));
  const over = consumed.kcal > targets.kcal;

  return (
    <div className="mx-auto h-full max-w-2xl space-y-6 overflow-y-auto px-5 py-6">
      <p className="text-sm capitalize text-zinc-500">{formatDayLabel(today)}</p>

      {/* Resumen del día */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-500 p-6 text-white shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm opacity-80">
              {over ? "Te pasaste por" : "Te quedan"}
            </p>
            <p className="text-5xl font-bold tracking-tight">
              {over ? consumed.kcal - targets.kcal : remaining}
              <span className="ml-1 text-lg font-normal opacity-80">kcal</span>
            </p>
          </div>
          <p className="text-right text-sm opacity-80">
            {consumed.kcal} / {targets.kcal}
            <br />
            kcal de hoy
          </p>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/25">
          <div
            className={`h-full rounded-full ${over ? "bg-red-300" : "bg-white"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <MacroBar icon={Beef} label="Proteína" value={consumed.protein} target={targets.protein} />
          <MacroBar icon={Wheat} label="Carbos" value={consumed.carb} target={targets.carb} />
          <MacroBar icon={Droplet} label="Grasas" value={consumed.fat} target={targets.fat} />
        </div>
      </section>

      {/* Cargar comida — siempre a mano */}
      <AddFood />

      {/* Comidas del día */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Comidas de hoy
        </h2>
        <MealList meals={meals} />
      </section>

      {/* Sugerencia */}
      <MealSuggestion />

      {/* Peso */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Peso
          </h2>
          <span className="text-sm text-zinc-500">
            Actual: <strong>{currentWeight} kg</strong>
            {profile.targetWeightKg && ` · Meta: ${profile.targetWeightKg} kg`}
          </span>
        </div>

        {weightSeries.length >= 2 && (
          <div className="mb-4">
            <WeightChart
              data={weightSeries}
              targetWeight={profile.targetWeightKg}
            />
          </div>
        )}

        <WeightForm current={latestWeight?.weightKg} />
      </section>

      <p className="text-xs text-zinc-400">
        Objetivo basado en Mifflin-St Jeor. No reemplaza el consejo de un
        profesional de la salud.
      </p>
    </div>
  );
}

function MacroBar({
  icon: Icon,
  label,
  value,
  target,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] opacity-90">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-0.5 text-sm font-semibold leading-none">
        {Math.round(value)}
        <span className="text-[11px] font-normal opacity-70">/{target}g</span>
      </p>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
