"use client";

import { useEffect, useState } from "react";
import { Camera, Pencil, Mic, CalendarDays, type LucideIcon } from "lucide-react";
import PhotoMeal from "./PhotoMeal";
import AddMealForm from "./AddMealForm";
import TextMeal from "./TextMeal";
import DayLoad from "./DayLoad";
import { PHOTOS_EVENT } from "@/lib/image";

type Tab = "photo" | "voice" | "day" | "manual";

const TABS: { value: Tab; label: string; icon: LucideIcon }[] = [
  { value: "photo", label: "Foto", icon: Camera },
  { value: "voice", label: "Voz", icon: Mic },
  { value: "day", label: "Día", icon: CalendarDays },
  { value: "manual", label: "Manual", icon: Pencil },
];

export default function AddFood() {
  const [tab, setTab] = useState<Tab>("photo");

  // Si llegan fotos desde el FAB, asegurarse de mostrar la pestaña de foto.
  useEffect(() => {
    const toPhoto = () => setTab("photo");
    window.addEventListener(PHOTOS_EVENT, toPhoto);
    return () => window.removeEventListener(PHOTOS_EVENT, toPhoto);
  }, []);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-50">
        Agregar comida
      </h2>

      <div
        role="tablist"
        aria-label="Forma de agregar comida"
        className="mb-4 grid grid-cols-4 gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800"
      >
        {TABS.map((t) => (
          <TabButton
            key={t.value}
            active={tab === t.value}
            onClick={() => setTab(t.value)}
            icon={t.icon}
          >
            {t.label}
          </TabButton>
        ))}
      </div>

      {tab === "photo" && <PhotoMeal />}
      {tab === "voice" && <TextMeal />}
      {tab === "day" && <DayLoad />}
      {tab === "manual" && <AddMealForm />}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-medium transition sm:flex-row sm:gap-1.5 sm:rounded-full sm:py-1.5 sm:text-sm ${
        active
          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
          : "text-zinc-500 dark:text-zinc-400"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </button>
  );
}
