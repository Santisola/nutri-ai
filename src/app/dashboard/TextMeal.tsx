"use client";

import { useEffect, useState, useTransition } from "react";
import { analyzeMealDescription, saveAnalyzedMeal } from "./actions";
import { type AnalyzedItem } from "@/lib/nutrition/foods";
import { currentMealType, type MealType } from "@/lib/date";
import VoiceTextarea from "./VoiceTextarea";
import MealItemsEditor from "./MealItemsEditor";
import FormError from "@/components/FormError";

const MAX_DESC = 600;

const MEAL_TYPES = [
  { value: "breakfast", label: "Desayuno" },
  { value: "lunch", label: "Almuerzo" },
  { value: "dinner", label: "Cena" },
  { value: "snack", label: "Snack" },
] as const;

const LOADING_STEPS = [
  "Leyendo tu descripción…",
  "Identificando alimentos…",
  "Estimando porciones…",
  "Cruzando con la base nutricional…",
  "Casi listo…",
];

export default function TextMeal() {
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<AnalyzedItem[] | null>(null);
  const [mealType, setMealType] = useState<MealType>(currentMealType());
  const [error, setError] = useState<string | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [saving, startSave] = useTransition();
  const [step, setStep] = useState(0);

  // Cicla los mensajes de carga mientras analiza (~15-30s en modelo free).
  useEffect(() => {
    if (!analyzing) return;
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      4000
    );
    return () => clearInterval(id);
  }, [analyzing]);

  function analyze() {
    if (description.trim().length < 3) {
      setError("Describí la comida con un poco más de detalle.");
      return;
    }
    setError(null);
    setStep(0);
    startAnalyze(async () => {
      const res = await analyzeMealDescription({ description });
      if (res.error || !res.items) {
        setError(res.error ?? "Error al procesar.");
        return;
      }
      setItems(res.items);
    });
  }

  function setGrams(idx: number, grams: number) {
    setItems((prev) =>
      prev ? prev.map((it, i) => (i === idx ? { ...it, grams } : it)) : prev
    );
  }

  function removeItem(idx: number) {
    setItems((prev) => (prev ? prev.filter((_, i) => i !== idx) : prev));
  }

  function reset() {
    setDescription("");
    setItems(null);
    setError(null);
  }

  function save() {
    if (!items || items.length === 0) return;
    startSave(async () => {
      const res = await saveAnalyzedMeal({ mealType, items, source: "ai" });
      if (res?.error) {
        setError(res.error);
        return;
      }
      reset();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {(description.length > 0 || items) && (
        <div className="flex justify-end">
          <button
            onClick={reset}
            className="text-sm text-zinc-400 hover:text-zinc-600"
          >
            Empezar de nuevo
          </button>
        </div>
      )}

      {!items && (
        <div>
          <label
            htmlFor="meal-text"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Describí tu comida (escribí o dictá por voz)
          </label>
          <VoiceTextarea
            id="meal-text"
            value={description}
            onChange={setDescription}
            rows={3}
            maxLength={MAX_DESC}
            disabled={analyzing}
            placeholder="Ej: dos milanesas de pollo con puré y una ensalada de tomate y cebolla…"
          />
          <p className="mt-1 text-xs text-zinc-400">
            Contá qué comiste y cuánto. La IA estima las porciones y vos las
            ajustás antes de guardar.
          </p>
        </div>
      )}

      {!items && (
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
            "Procesar con IA"
          )}
        </button>
      )}

      {analyzing && (
        <p className="text-center text-xs text-zinc-500">
          El modelo gratuito puede tardar ~15-30 segundos. No cierres la página.
        </p>
      )}

      {error && <FormError>{error}</FormError>}

      {items && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setMealType(t.value)}
                className={`rounded-full px-3 py-1 text-sm transition ${
                  mealType === t.value
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <MealItemsEditor
            items={items}
            onGrams={setGrams}
            onRemove={removeItem}
          />

          <p className="text-xs text-zinc-400">
            Revisá y ajustá los gramos. Los ítems marcados “estimación IA” son
            aproximados.
          </p>

          <button
            onClick={save}
            disabled={saving || items.length === 0}
            className="h-11 rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Confirmar y guardar"}
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
