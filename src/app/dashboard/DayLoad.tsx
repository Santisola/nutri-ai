"use client";

import { useEffect, useState, useTransition } from "react";
import { analyzeDayDescription, saveDayMeals } from "./actions";
import { sumAnalyzed, type AnalyzedItem } from "@/lib/nutrition/foods";
import { type MealType } from "@/lib/date";
import VoiceTextarea from "./VoiceTextarea";
import MealItemsEditor from "./MealItemsEditor";

const MAX_DESC = 2000;

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  snack: "Merienda / snack",
  dinner: "Cena",
};

const LOADING_STEPS = [
  "Leyendo tu día…",
  "Separando en comidas…",
  "Identificando alimentos…",
  "Estimando porciones…",
  "Cruzando con la base nutricional…",
  "Casi listo…",
];

interface DayMeal {
  mealType: MealType;
  items: AnalyzedItem[];
}

export default function DayLoad() {
  const [description, setDescription] = useState("");
  const [meals, setMeals] = useState<DayMeal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [saving, startSave] = useTransition();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!analyzing) return;
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      4500
    );
    return () => clearInterval(id);
  }, [analyzing]);

  function analyze() {
    if (description.trim().length < 10) {
      setError("Contá lo que comiste en el día con un poco más de detalle.");
      return;
    }
    setError(null);
    setStep(0);
    startAnalyze(async () => {
      const res = await analyzeDayDescription({ description });
      if (res.error || !res.meals) {
        setError(res.error ?? "Error al procesar.");
        return;
      }
      setMeals(res.meals);
    });
  }

  function setGrams(mealIdx: number, itemIdx: number, grams: number) {
    setMeals((prev) =>
      prev
        ? prev.map((meal, mi) =>
            mi === mealIdx
              ? {
                  ...meal,
                  items: meal.items.map((it, ii) =>
                    ii === itemIdx ? { ...it, grams } : it
                  ),
                }
              : meal
          )
        : prev
    );
  }

  function removeItem(mealIdx: number, itemIdx: number) {
    setMeals((prev) =>
      prev
        ? prev
            .map((meal, mi) =>
              mi === mealIdx
                ? { ...meal, items: meal.items.filter((_, ii) => ii !== itemIdx) }
                : meal
            )
            // Si una comida queda sin alimentos, la sacamos.
            .filter((meal) => meal.items.length > 0)
        : prev
    );
  }

  function reset() {
    setDescription("");
    setMeals(null);
    setError(null);
  }

  function save() {
    if (!meals || meals.length === 0) return;
    startSave(async () => {
      const res = await saveDayMeals({ meals });
      if (res?.error) {
        setError(res.error);
        return;
      }
      reset();
    });
  }

  const grandTotal = meals
    ? sumAnalyzed(meals.flatMap((m) => m.items))
    : { kcal: 0, protein: 0, carb: 0, fat: 0 };

  return (
    <div className="flex flex-col gap-4">
      {(description.length > 0 || meals) && (
        <div className="flex justify-end">
          <button
            onClick={reset}
            className="text-sm text-zinc-400 hover:text-zinc-600"
          >
            Empezar de nuevo
          </button>
        </div>
      )}

      {!meals && (
        <div>
          <label
            htmlFor="day-text"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Contá todo lo que comiste hoy (escribí o dictá por voz)
          </label>
          <VoiceTextarea
            id="day-text"
            value={description}
            onChange={setDescription}
            rows={5}
            maxLength={MAX_DESC}
            disabled={analyzing}
            placeholder="Ej: en el desayuno tomé un café con leche y dos tostadas con queso. Al mediodía comí milanesa con ensalada. A la tarde un yogur con una banana. A la noche una pizza de muzzarella, dos porciones…"
          />
          <p className="mt-1 text-xs text-zinc-400">
            La IA separa tu día en desayuno, almuerzo, merienda y cena. Después
            revisás y ajustás antes de guardar todo.
          </p>
        </div>
      )}

      {!meals && (
        <button
          onClick={analyze}
          disabled={analyzing}
          className="h-11 rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-70"
        >
          {analyzing ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> {LOADING_STEPS[step]}
            </span>
          ) : (
            "Procesar día con IA"
          )}
        </button>
      )}

      {analyzing && (
        <p className="text-center text-xs text-zinc-500">
          Separar el día entero puede tardar ~20-40 segundos. No cierres la
          página.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {meals && (
        <div className="flex flex-col gap-5">
          {meals.map((meal, mealIdx) => (
            <div key={mealIdx} className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                {MEAL_LABEL[meal.mealType]}
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium normal-case text-zinc-500 dark:bg-zinc-800">
                  {Math.round(sumAnalyzed(meal.items).kcal)} kcal
                </span>
              </h3>
              <MealItemsEditor
                items={meal.items}
                onGrams={(itemIdx, grams) => setGrams(mealIdx, itemIdx, grams)}
                onRemove={(itemIdx) => removeItem(mealIdx, itemIdx)}
                showTotal={false}
              />
            </div>
          ))}

          <div className="flex items-center justify-between rounded-lg bg-emerald-100 px-3 py-2 text-sm dark:bg-emerald-950/40">
            <span className="font-medium">Total del día</span>
            <span>
              {Math.round(grandTotal.kcal)} kcal · P{" "}
              {Math.round(grandTotal.protein)} · C {Math.round(grandTotal.carb)} ·
              G {Math.round(grandTotal.fat)}
            </span>
          </div>

          <p className="text-xs text-zinc-400">
            Revisá cada comida y ajustá los gramos. Los ítems marcados “estimación
            IA” son aproximados.
          </p>

          <button
            onClick={save}
            disabled={saving || meals.length === 0}
            className="h-11 rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving
              ? "Guardando…"
              : `Guardar día (${meals.length} ${meals.length === 1 ? "comida" : "comidas"})`}
          </button>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}
