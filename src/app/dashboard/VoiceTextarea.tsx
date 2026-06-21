"use client";

import { useEffect, useRef } from "react";
import { Mic, Square } from "lucide-react";
import { useSpeechToText } from "@/lib/useSpeechToText";

/**
 * Textarea con dictado por voz: un botón de micrófono que transcribe (Web Speech
 * API) y va agregando el texto al contenido. Si el navegador no soporta voz, se
 * muestra solo el textarea (se puede escribir igual).
 */
export default function VoiceTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength = 600,
  disabled = false,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  id?: string;
}) {
  const { supported, listening, start, stop } = useSpeechToText();
  // Ref para leer el valor más reciente dentro del callback de transcripción
  // (que se dispara async, fuera del render).
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  function toggle() {
    if (listening) {
      stop();
      return;
    }
    start((chunk) => {
      const prev = valueRef.current.trim();
      const next = (prev ? `${prev} ${chunk}` : chunk).slice(0, maxLength);
      onChange(next);
    });
  }

  return (
    <div className="relative">
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-12 text-sm outline-none focus:border-emerald-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {supported && (
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          aria-label={listening ? "Detener dictado" : "Dictar por voz"}
          aria-pressed={listening}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-50 ${
            listening
              ? "animate-pulse bg-red-500 text-white hover:bg-red-600"
              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400"
          }`}
        >
          {listening ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>
      )}
      {listening && (
        <p className="mt-1 text-xs text-red-500">Escuchando… hablá y se va escribiendo solo.</p>
      )}
    </div>
  );
}
