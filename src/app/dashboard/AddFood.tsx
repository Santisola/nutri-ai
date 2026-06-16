"use client";

import { useEffect, useState } from "react";
import { Camera, Pencil } from "lucide-react";
import PhotoMeal from "./PhotoMeal";
import AddMealForm from "./AddMealForm";
import { PHOTOS_EVENT } from "@/lib/image";

export default function AddFood() {
  const [tab, setTab] = useState<"photo" | "manual">("photo");

  // Si llegan fotos desde el FAB, asegurarse de mostrar la pestaña de foto.
  useEffect(() => {
    const toPhoto = () => setTab("photo");
    window.addEventListener(PHOTOS_EVENT, toPhoto);
    return () => window.removeEventListener(PHOTOS_EVENT, toPhoto);
  }, []);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Agregar comida
        </h2>
        <div className="flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-800">
          <TabButton active={tab === "photo"} onClick={() => setTab("photo")}>
            <Camera className="h-4 w-4" /> Foto
          </TabButton>
          <TabButton active={tab === "manual"} onClick={() => setTab("manual")}>
            <Pencil className="h-4 w-4" /> Manual
          </TabButton>
        </div>
      </div>

      {tab === "photo" ? <PhotoMeal /> : <AddMealForm />}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition ${
        active
          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
          : "text-zinc-500 dark:text-zinc-400"
      }`}
    >
      {children}
    </button>
  );
}
