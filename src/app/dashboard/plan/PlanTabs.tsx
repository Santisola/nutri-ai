"use client";

import { useState } from "react";
import { ClipboardList, ShoppingCart, CalendarRange } from "lucide-react";
import PlanView from "./PlanView";
import ShoppingListView from "./ShoppingListView";
import WeekCalendar from "../semana/WeekCalendar";
import type { ShoppingListPayload } from "./actions";
import type { EntryView, MealView, DayTargets } from "../semana/types";

type Tab = "plan" | "compras" | "semana";

const HEADERS: Record<Tab, { title: string; desc: string }> = {
  plan: {
    title: "Tu plan",
    desc: "Una guía personalizada para alcanzar tu objetivo. Pedí cambios desde el chat cuando quieras.",
  },
  compras: {
    title: "Lista de compras",
    desc: "Ingredientes accesibles para stockearte y comer alineado al plan, sin recaer en delivery.",
  },
  semana: {
    title: "Tu semana",
    desc: "Planificá tus comidas, armá tu semana con IA y generá la lista de compras a partir de ella.",
  },
};

export default function PlanTabs({
  planContent,
  planSource,
  planUpdatedAt,
  shoppingList,
  shoppingKey,
  defaultHouseholdSize,
  week,
  initialTab = "plan",
}: {
  planContent: string | null;
  planSource: "generated" | "imported";
  planUpdatedAt?: string;
  shoppingList: ShoppingListPayload | null;
  shoppingKey: number;
  defaultHouseholdSize: number;
  week: {
    weekStart: string;
    entries: EntryView[];
    savedMeals: MealView[];
    targets: DayTargets;
    today: string;
  };
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const header = HEADERS[tab];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {header.title}
        </h1>
        <p className="text-sm text-zinc-500">{header.desc}</p>
      </header>

      <div className="flex gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800">
        <TabButton
          active={tab === "plan"}
          onClick={() => setTab("plan")}
          icon={<ClipboardList className="h-4 w-4" />}
          label="Plan"
        />
        <TabButton
          active={tab === "compras"}
          onClick={() => setTab("compras")}
          icon={<ShoppingCart className="h-4 w-4" />}
          label="Compras"
        />
        <TabButton
          active={tab === "semana"}
          onClick={() => setTab("semana")}
          icon={<CalendarRange className="h-4 w-4" />}
          label="Semana"
        />
      </div>

      {/* Ambas vistas montadas; ocultamos la inactiva para preservar su estado
          (PlanView autogenera al montar; no queremos remontarla al cambiar de tab). */}
      <div className={tab === "plan" ? "" : "hidden"}>
        <PlanView
          initialContent={planContent}
          initialSource={planSource}
          updatedAt={planUpdatedAt}
        />
      </div>
      <div className={tab === "compras" ? "" : "hidden"}>
        <ShoppingListView
          key={shoppingKey}
          initialList={shoppingList}
          defaultHouseholdSize={defaultHouseholdSize}
        />
      </div>
      <div className={tab === "semana" ? "" : "hidden"}>
        <WeekCalendar
          key={week.weekStart}
          weekStart={week.weekStart}
          entries={week.entries}
          savedMeals={week.savedMeals}
          targets={week.targets}
          today={week.today}
        />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-white text-emerald-600 shadow-sm dark:bg-zinc-950 dark:text-emerald-400"
          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
