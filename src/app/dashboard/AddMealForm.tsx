"use client";

import { useState, useTransition, useRef } from "react";
import { X } from "lucide-react";
import { searchFoods, addMeal } from "./actions";
import type { Food } from "@/lib/nutrition/foods";

type Item = { food: Food; grams: number };

const MEAL_TYPES = [
  { value: "breakfast", label: "Desayuno" },
  { value: "lunch", label: "Almuerzo" },
  { value: "dinner", label: "Cena" },
  { value: "snack", label: "Snack" },
] as const;

function scale(food: Food, grams: number) {
  const f = grams / 100;
  return {
    kcal: Math.round(food.kcalPer100g * f),
    protein: Math.round(food.proteinPer100g * f),
    carb: Math.round(food.carbPer100g * f),
    fat: Math.round(food.fatPer100g * f),
  };
}

export default function AddMealForm() {
  const [mealType, setMealType] = useState<string>("lunch");
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [searching, startSearch] = useTransition();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onQueryChange(value: string) {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(() => {
      startSearch(async () => setResults(await searchFoods(value)));
    }, 250);
  }

  function addItem(food: Food) {
    setItems((prev) => [...prev, { food, grams: 100 }]);
    setQuery("");
    setResults([]);
  }

  function setGrams(idx: number, grams: number) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, grams } : it))
    );
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = items.reduce(
    (acc, it) => {
      const m = scale(it.food, it.grams);
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
      const res = await addMeal({
        mealType,
        items: items.map((it) => ({ foodId: it.food.id, grams: it.grams })),
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setItems([]);
    });
  }

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
          placeholder="Buscar alimento (ej: fideos, pollo)…"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {(results.length > 0 || searching) && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
            {searching && (
              <li className="px-3 py-2 text-sm text-zinc-400">Buscando…</li>
            )}
            {results.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => addItem(f)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-zinc-700"
                >
                  <span>{f.name}</span>
                  <span className="text-xs text-zinc-400">
                    {f.kcalPer100g} kcal/100g
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((it, idx) => {
            const m = scale(it.food, it.grams);
            return (
              <li
                key={idx}
                className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50"
              >
                <span className="flex-1 text-sm">{it.food.name}</span>
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
            {total.kcal} kcal · P {total.protein} · C {total.carb} · G{" "}
            {total.fat}
          </span>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="h-11 rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Guardar comida"}
      </button>
    </div>
  );
}
