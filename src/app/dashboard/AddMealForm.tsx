"use client";

import { useState, useTransition, useRef } from "react";
import { X, Sparkles } from "lucide-react";
import { searchFoods, estimateManualFood, saveAnalyzedMeal } from "./actions";
import { macrosFor, type Food, type AnalyzedItem } from "@/lib/nutrition/foods";
import FormError from "@/components/FormError";

const MEAL_TYPES = [
  { value: "breakfast", label: "Desayuno" },
  { value: "lunch", label: "Almuerzo" },
  { value: "dinner", label: "Cena" },
  { value: "snack", label: "Snack" },
] as const;

export default function AddMealForm() {
  const [mealType, setMealType] = useState<string>("lunch");
  const [items, setItems] = useState<AnalyzedItem[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [searching, startSearch] = useTransition();
  const [estimating, startEstimate] = useTransition();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onQueryChange(value: string) {
    setQuery(value);
    // Al escribir de nuevo, limpiamos el error para reabrir el dropdown.
    if (error) setError(null);
    if (debounce.current) clearTimeout(debounce.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(() => {
      startSearch(async () => setResults(await searchFoods(value)));
    }, 250);
  }

  function addDbItem(food: Food) {
    setItems((prev) => [
      ...prev,
      {
        label: food.name,
        grams: 100,
        foodId: food.id,
        kcalPer100g: food.kcalPer100g,
        proteinPer100g: food.proteinPer100g,
        carbPer100g: food.carbPer100g,
        fatPer100g: food.fatPer100g,
        source: "db",
      },
    ]);
    setQuery("");
    setResults([]);
  }

  function addTextItem() {
    const label = query.trim();
    if (label.length < 2) return;
    setError(null);
    startEstimate(async () => {
      const res = await estimateManualFood(label);
      if (res.error || !res.item) {
        setError(res.error ?? "No se pudo estimar.");
        return;
      }
      const { grams, ...per100 } = res.item!;
      setItems((prev) => [
        ...prev,
        { label, grams, foodId: null, ...per100, source: "ai" },
      ]);
      setQuery("");
      setResults([]);
    });
  }

  function setGrams(idx: number, grams: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, grams } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = items.reduce(
    (acc, it) => {
      const m = macrosFor(it);
      return {
        kcal: acc.kcal + m.kcal,
        protein: acc.protein + m.protein,
        carb: acc.carb + m.carb,
        fat: acc.fat + m.fat,
      };
    },
    { kcal: 0, protein: 0, carb: 0, fat: 0 }
  );

  function save() {
    setError(null);
    if (items.length === 0) {
      setError("Agregá al menos un alimento.");
      return;
    }
    startSave(async () => {
      const res = await saveAnalyzedMeal({ mealType, items, source: "manual" });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setItems([]);
    });
  }

  // El dropdown se cierra cuando hay un error visible (ej: "no es comida").
  const showDropdown = query.trim().length >= 2 && !error;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {MEAL_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setMealType(t.value)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              mealType === t.value
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length === 0) {
              e.preventDefault();
              addTextItem();
            }
          }}
          placeholder="Buscar o describir (ej: 2 porciones de ñoquis con tuco)…"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {showDropdown && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
            {searching && (
              <li className="px-3 py-2 text-sm text-zinc-400">Buscando…</li>
            )}
            {results.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => addDbItem(f)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-zinc-700"
                >
                  <span>{f.name}</span>
                  <span className="text-xs text-zinc-400">
                    {f.kcalPer100g} kcal/100g
                  </span>
                </button>
              </li>
            ))}

            {!searching && results.length === 0 && (
              <li className="px-3 py-2 text-xs text-zinc-400">
                No está en la base. Estimalo con IA:
              </li>
            )}

            <li className="border-t border-zinc-100 dark:border-zinc-700">
              <button
                onClick={addTextItem}
                disabled={estimating}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-zinc-700"
              >
                <Sparkles className="h-4 w-4" />
                {estimating
                  ? "Estimando con IA…"
                  : `Agregar “${query.trim()}” y estimar con IA`}
              </button>
            </li>
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((it, idx) => {
            const m = macrosFor(it);
            return (
              <li
                key={idx}
                className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50"
              >
                <div className="flex-1">
                  <p className="text-sm">{it.label}</p>
                  <span
                    className={`text-[10px] font-medium uppercase ${
                      it.source === "db" ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {it.source === "db" ? "base · preciso" : "estimación IA"}
                  </span>
                </div>
                <input
                  type="number"
                  value={it.grams}
                  min={1}
                  onChange={(e) =>
                    setGrams(idx, Math.max(1, Number(e.target.value) || 0))
                  }
                  className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                />
                <span className="text-xs text-zinc-500">g</span>
                <span className="w-16 text-right text-sm font-medium text-emerald-600">
                  {m.kcal} kcal
                </span>
                <button
                  onClick={() => removeItem(idx)}
                  className="text-zinc-400 transition hover:text-red-500"
                  aria-label="Quitar"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/30">
          <span className="font-medium">Total</span>
          <span>
            {Math.round(total.kcal)} kcal · P {Math.round(total.protein)} · C{" "}
            {Math.round(total.carb)} · G {Math.round(total.fat)}
          </span>
        </div>
      )}

      {error && <FormError>{error}</FormError>}

      {/* El botón de guardar no se muestra mientras hay un error visible. */}
      {!error && (
        <button
          onClick={save}
          disabled={saving}
          className="h-11 rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar comida"}
        </button>
      )}
    </div>
  );
}
