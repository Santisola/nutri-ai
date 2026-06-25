"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteMeal } from "./actions";
import type { MealWithItems } from "@/lib/queries";

const MEAL_LABEL: Record<string, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snack",
};

export default function MealList({ meals }: { meals: MealWithItems[] }) {
  if (meals.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
        Todavía no registraste comidas hoy.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {meals.map((m) => (
        <MealRow key={m.id} meal={m} />
      ))}
    </ul>
  );
}

function MealRow({ meal }: { meal: MealWithItems }) {
  const [pending, start] = useTransition();

  return (
    <li
      className={`rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
            {MEAL_LABEL[meal.mealType] ?? meal.mealType}
          </p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            {meal.items
              .map((i) => (i.grams > 0 ? `${i.label} (${i.grams}g)` : i.label))
              .join(" · ")}
          </p>
        </div>
        <button
          onClick={() => start(() => deleteMeal(meal.id).then(() => {}))}
          className="text-zinc-400 transition hover:text-red-500"
          aria-label="Borrar comida"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {meal.kcal} kcal
        <span className="ml-2 text-xs font-normal text-zinc-400">
          P {meal.protein}g · C {meal.carb}g · G {meal.fat}g
        </span>
      </p>
    </li>
  );
}
