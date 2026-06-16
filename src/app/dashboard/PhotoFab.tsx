"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Plus } from "lucide-react";
import {
  fileToScaledDataUrl,
  savePendingPhotos,
  PHOTOS_EVENT,
} from "@/lib/image";

const MAX_IMAGES = 5;

export default function PhotoFab() {
  const [open, setOpen] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const files = Array.from(input.files ?? []).slice(0, MAX_IMAGES);
    input.value = "";
    setOpen(false);
    if (files.length === 0) return;

    const urls = await Promise.all(files.map((f) => fileToScaledDataUrl(f)));
    savePendingPhotos(urls);
    router.push("/dashboard");
    // Si ya estamos en Hoy, avisamos para que PhotoMeal las tome.
    window.dispatchEvent(new Event(PHOTOS_EVENT));
  }

  return (
    <div className="relative flex flex-1 justify-center">
      {open && (
        <>
          {/* cierre al tocar afuera */}
          <button
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute bottom-16 left-1/2 z-40 flex -translate-x-1/2 flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
            <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700">
              <Camera className="h-4 w-4 text-emerald-600" />
              Cámara
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={onPick}
                className="hidden"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700">
              <ImagePlus className="h-4 w-4 text-emerald-600" />
              Galería
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onPick}
                className="hidden"
              />
            </label>
          </div>
        </>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Registrar comida con foto"
        className={`absolute -top-5 left-1/2 z-40 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg ring-4 ring-zinc-50 transition hover:bg-emerald-700 dark:ring-zinc-950 ${
          open ? "rotate-45" : ""
        }`}
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  );
}
