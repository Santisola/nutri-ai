"use client";

import { X } from "lucide-react";
import { macrosFor, sumAnalyzed, type AnalyzedItem } from "@/lib/nutrition/foods";

/**
 * Lista editable de alimentos detectados (de foto, texto o voz): permite ajustar
 * los gramos, quitar ítems y muestra el total. Presentacional; el estado vive en
 * el componente padre. `showTotal` permite ocultar el total cuando el padre
 * muestra uno agregado (ej: total del día).
 */
export default function MealItemsEditor({
  items,
  onGrams,
  onRemove,
  showTotal = true,
}: {
  items: AnalyzedItem[];
  onGrams: (idx: number, grams: number) => void;
  onRemove: (idx: number) => void;
  showTotal?: boolean;
}) {
  const total = sumAnalyzed(items);

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {items.map((it, idx) => {
          const m = macrosFor(it);
          return (
            <li
              key={idx}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 dark:bg-zinc-900"
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
                  onGrams(idx, Math.max(1, Number(e.target.value) || 0))
                }
                className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              />
              <span className="text-xs text-zinc-500">g</span>
              <span className="w-16 text-right text-sm font-medium text-emerald-600">
                {m.kcal} kcal
              </span>
              <button
                onClick={() => onRemove(idx)}
                className="text-zinc-400 transition hover:text-red-500"
                aria-label="Quitar"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      {showTotal && items.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-100 px-3 py-2 text-sm dark:bg-emerald-950/40">
          <span className="font-medium">Total</span>
          <span>
            {Math.round(total.kcal)} kcal · P {Math.round(total.protein)} · C{" "}
            {Math.round(total.carb)} · G {Math.round(total.fat)}
          </span>
        </div>
      )}
    </div>
  );
}
