"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Sparkles,
  BookOpen,
  Trash2,
  Check,
  Circle,
  ArrowLeft,
} from "lucide-react";
import Markdown from "@/components/Markdown";
import FormError from "@/components/FormError";
import {
  regenerateSlot,
  clearSlot,
  assignSavedMeal,
  markEntryEaten,
  unmarkEntryEaten,
} from "./actions";
import { MEAL_LABEL, type EntryView, type MealView } from "./types";
import type { MealType } from "@/lib/ai/types";
import { formatDayLabel } from "@/lib/date";

type Mode = "main" | "library";

export default function SlotSheet({
  date,
  mealType,
  entry,
  savedMeals,
  onClose,
}: {
  date: string;
  mealType: MealType;
  entry: EntryView | null;
  savedMeals: MealView[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("main");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>, close = false) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      if (close) onClose();
    });
  }

  // Biblioteca ordenada: primero las del tipo del slot.
  const sortedMeals = [...savedMeals].sort((a, b) => {
    const am = a.mealType === mealType ? 0 : 1;
    const bm = b.mealType === mealType ? 0 : 1;
    return am - bm;
  });

  const eaten = !!entry?.mealLogId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === "library" && (
              <button
                onClick={() => setMode("main")}
                className="text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label="Volver"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                {MEAL_LABEL[mealType]}
              </p>
              <p className="text-sm capitalize text-zinc-500">
                {formatDayLabel(date)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <FormError className="mb-3">{error}</FormError>}

        {mode === "main" ? (
          <div className={pending ? "pointer-events-none opacity-60" : ""}>
            {entry ? (
              <>
                <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {entry.meal.title}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {Math.round(entry.meal.kcal)} kcal
                    <span className="ml-2 text-xs font-normal text-zinc-400">
                      P {Math.round(entry.meal.protein)}g · C{" "}
                      {Math.round(entry.meal.carb)}g · G{" "}
                      {Math.round(entry.meal.fat)}g
                    </span>
                  </p>
                  {entry.meal.recipe && (
                    <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                      <Markdown>{entry.meal.recipe}</Markdown>
                    </div>
                  )}
                  {entry.meal.ingredients.length > 0 && (
                    <p className="mt-2 text-xs text-zinc-500">
                      {entry.meal.ingredients
                        .map((i) =>
                          i.quantity ? `${i.name} (${i.quantity})` : i.name
                        )
                        .join(" · ")}
                    </p>
                  )}
                </div>

                <button
                  onClick={() =>
                    run(() =>
                      eaten
                        ? unmarkEntryEaten(entry.id)
                        : markEntryEaten(entry.id)
                    )
                  }
                  className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                    eaten
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                  }`}
                >
                  {eaten ? (
                    <>
                      <Check className="h-4 w-4" /> Comida registrada — deshacer
                    </>
                  ) : (
                    <>
                      <Circle className="h-4 w-4" /> Marcar como comido
                    </>
                  )}
                </button>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <SheetAction
                    icon={<Sparkles className="h-4 w-4" />}
                    label="Cambiar con IA"
                    onClick={() => run(() => regenerateSlot(date, mealType))}
                  />
                  <SheetAction
                    icon={<BookOpen className="h-4 w-4" />}
                    label="Elegir de biblioteca"
                    onClick={() => setMode("library")}
                  />
                </div>
                <button
                  onClick={() => run(() => clearSlot(date, mealType), true)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" /> Vaciar slot
                </button>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <SheetAction
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Generar con IA"
                  onClick={() => run(() => regenerateSlot(date, mealType))}
                  primary
                />
                <SheetAction
                  icon={<BookOpen className="h-4 w-4" />}
                  label="Elegir de mi biblioteca"
                  onClick={() => setMode("library")}
                />
              </div>
            )}
          </div>
        ) : (
          <div className={pending ? "pointer-events-none opacity-60" : ""}>
            {sortedMeals.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
                Tu biblioteca está vacía. Generá comidas con IA o cargá una desde
                la pestaña Comidas.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sortedMeals.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() =>
                        run(() => assignSavedMeal(date, mealType, m.id), true)
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-zinc-800 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/20"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {m.title}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {MEAL_LABEL[m.mealType]} · {Math.round(m.kcal)} kcal
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SheetAction({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
        primary
          ? "bg-emerald-600 text-white hover:bg-emerald-700"
          : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
