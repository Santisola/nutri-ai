import { redirect } from "next/navigation";
import {
  getCurrentUserId,
  getProfile,
  getPlan,
  getShoppingList,
  getWeekPlan,
  getSavedMeals,
} from "@/lib/queries";
import { getEffectiveTargets } from "@/lib/nutrition/targets-effective";
import { todayISO, weekStartISO } from "@/lib/date";
import type { MealType } from "@/lib/ai/types";
import type { EntryView, MealView } from "../semana/types";
import PlanTabs from "./PlanTabs";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; week?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const profile = await getProfile(userId);
  if (!profile) redirect("/onboarding");

  const { tab, week } = await searchParams;
  const today = todayISO();
  const weekStart = weekStartISO(
    week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : today
  );

  const [plan, shopping, entries, savedMeals, targets] = await Promise.all([
    getPlan(userId),
    getShoppingList(userId),
    getWeekPlan(userId, weekStart),
    getSavedMeals(userId),
    getEffectiveTargets(userId),
  ]);

  const updatedAt = plan
    ? new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(plan.updatedAt)
    : undefined;

  const shoppingList = shopping
    ? {
        period: shopping.period as "weekly" | "biweekly",
        householdSize: shopping.householdSize,
        items: shopping.items,
        mealIdeas: shopping.mealIdeas,
      }
    : null;
  // Cambia cuando la lista se actualiza (p.ej. derivada desde la semana) para
  // remontar ShoppingListView con los datos frescos.
  const shoppingKey = shopping?.updatedAt?.getTime() ?? 0;

  const toMealView = (m: {
    id: number;
    title: string;
    mealType: string;
    recipe: string;
    ingredients: MealView["ingredients"];
    servings: number;
    kcal: number;
    protein: number;
    carb: number;
    fat: number;
    source: string;
  }): MealView => ({
    id: m.id,
    title: m.title,
    mealType: m.mealType as MealType,
    recipe: m.recipe,
    ingredients: m.ingredients,
    servings: m.servings,
    kcal: m.kcal,
    protein: m.protein,
    carb: m.carb,
    fat: m.fat,
    source: m.source as "ai" | "manual",
  });

  const entryViews: EntryView[] = entries.map((e) => ({
    id: e.id,
    date: e.date,
    mealType: e.mealType as MealType,
    mealLogId: e.mealLogId,
    meal: toMealView(e.meal),
  }));

  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto px-5 py-6">
      <PlanTabs
        planContent={plan?.content ?? null}
        planSource={(plan?.source as "generated" | "imported") ?? "generated"}
        planUpdatedAt={updatedAt}
        shoppingList={shoppingList}
        shoppingKey={shoppingKey}
        defaultHouseholdSize={profile.householdSize}
        week={{
          weekStart,
          entries: entryViews,
          savedMeals: savedMeals.map(toMealView),
          targets: {
            kcal: targets?.kcal ?? 0,
            protein: targets?.protein ?? 0,
            carb: targets?.carb ?? 0,
            fat: targets?.fat ?? 0,
          },
          today,
        }}
        initialTab={
          tab === "compras" ? "compras" : tab === "semana" ? "semana" : "plan"
        }
      />
    </div>
  );
}
