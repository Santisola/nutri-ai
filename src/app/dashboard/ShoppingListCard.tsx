"use client";

import { ShoppingCart, ChevronRight } from "lucide-react";
import { useNav } from "./NavProgress";

/**
 * Acceso a la lista de compras desde la Home, para dar a conocer la feature.
 * Navega a la pestaña Compras dentro de la sección Plan.
 */
export default function ShoppingListCard() {
  const { navigate } = useNav();
  return (
    <button
      onClick={() => navigate("/dashboard/plan?tab=compras")}
      className="flex w-full items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/20"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
        <ShoppingCart className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">
          Tu lista de compras
        </p>
        <p className="text-sm text-zinc-500">
          Armá la compra de la semana, alineada a tu plan.
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" />
    </button>
  );
}
