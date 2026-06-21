"use client";

import { useState, useTransition } from "react";
import { Utensils } from "lucide-react";
import { suggestNextMeal } from "./actions";
import type { MealSuggestion as Suggestion } from "@/lib/ai/types";
import type { MealType } from "@/lib/date";
import FormError from "@/components/FormError";

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Desayuno" },
  { value: "lunch", label: "Almuerzo" },
  { value: "snack", label: "Snack" },
  { value: "dinner", label: "Cena" },
];

export default function MealSuggestion() {
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [result, setResult] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function suggest() {
    setError(null);
    start(async () => {
      const res = await suggestNextMeal(mealType ?? undefined);
      if (res.error || !res.suggestion) {
        setError(res.error ?? "Error al sugerir.");
        return;
      }
      setResult(res.suggestion);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
          <Utensils className="h-4 w-4 text-emerald-600" />
          ¿Qué como ahora?
        </h3>
        <p className="text-sm text-zinc-500">
          Sugerencias según lo que te queda hoy y tus gustos.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMealType(null)}
          className={`rounded-full px-3 py-1 text-sm transition ${
            mealType === null
              ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          Automático
        </button>
        {MEAL_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setMealType(t.value)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              mealType === t.value
                ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <button
        onClick={suggest}
        disabled={pending}
        className="h-11 rounded-full bg-zinc-900 font-medium text-white transition hover:bg-zinc-700 disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner /> Pensando opciones…
          </span>
        ) : result ? (
          "Sugerir otra vez"
        ) : (
          "Sugerir qué comer"
        )}
      </button>

      {pending && (
        <p className="text-center text-xs text-zinc-500">
          El modelo gratuito puede tardar ~15 segundos.
        </p>
      )}

      {error && <FormError>{error}</FormError>}

      {result && result.suggestions.length > 0 && (
        <ul className="flex flex-col gap-3">
          {result.suggestions.map((s, i) => (
            <li
              key={i}
              className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {s.title}
                </h4>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  ~{Math.round(s.approxKcal)} kcal
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {s.description}
              </p>
              {s.ingredients.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.ingredients.map((ing, j) => (
                    <span
                      key={j}
                      className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/30 dark:border-t-zinc-900" />
  );
}
