"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, Sparkles, X } from "lucide-react";
import { extractPdfText, PDF_MIN_TEXT } from "@/lib/pdf";
import { processImportedPlan, saveImportedPlan } from "./actions";
import FormError from "@/components/FormError";

type Phase = "idle" | "reading" | "processing" | "review";
type TargetFields = { kcal: string; protein: string; carb: string; fat: string };

const EMPTY: TargetFields = { kcal: "", protein: "", carb: "", fat: "" };

export default function ImportPdf({
  variant = "secondary",
  onSaved,
}: {
  variant?: "primary" | "secondary";
  onSaved: (content: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [targets, setTargets] = useState<TargetFields>(EMPTY);
  const [hadTargets, setHadTargets] = useState(false);
  const [saving, startSave] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setPhase("reading");

    let text = "";
    try {
      text = await extractPdfText(file);
    } catch {
      setError("No se pudo leer el PDF.");
      setPhase("idle");
      return;
    }
    if (text.length < PDF_MIN_TEXT) {
      setError(
        "El PDF parece escaneado (sin texto seleccionable). Subí un PDF digital o pedí el archivo a tu nutricionista."
      );
      setPhase("idle");
      return;
    }

    setPhase("processing");
    const res = await processImportedPlan(text);
    if (res.error || !res.plan) {
      setError(res.error ?? "No se pudo procesar.");
      setPhase("idle");
      return;
    }
    setContent(res.plan);
    if (res.targets) {
      setTargets({
        kcal: String(res.targets.kcal),
        protein: String(res.targets.protein),
        carb: String(res.targets.carb),
        fat: String(res.targets.fat),
      });
      setHadTargets(true);
    } else {
      setTargets(EMPTY);
      setHadTargets(false);
    }
    setPhase("review");
  }

  function cancel() {
    setPhase("idle");
    setError(null);
    setContent("");
    setTargets(EMPTY);
  }

  function save() {
    setError(null);
    const num = (s: string) => {
      const n = Number(s);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    startSave(async () => {
      const res = await saveImportedPlan({
        content,
        kcal: num(targets.kcal),
        protein: num(targets.protein),
        carb: num(targets.carb),
        fat: num(targets.fat),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      onSaved(content);
      cancel();
    });
  }

  // Trigger + estados de carga
  if (phase === "idle" || phase === "reading" || phase === "processing") {
    const busy = phase !== "idle";
    const cls =
      variant === "primary"
        ? "h-11 rounded-full bg-emerald-600 px-6 font-medium text-white transition hover:bg-emerald-700"
        : "inline-flex items-center justify-center gap-2 rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";
    return (
      <div className="flex flex-col gap-2">
        <label className={`cursor-pointer ${cls} ${busy ? "opacity-70" : ""}`}>
          <FileUp className="h-4 w-4" />
          {phase === "reading"
            ? "Leyendo el PDF…"
            : phase === "processing"
              ? "Procesando con IA…"
              : "Importar PDF de mi nutricionista"}
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={onPick}
            disabled={busy}
            className="hidden"
          />
        </label>
        {phase === "processing" && (
          <p className="text-xs text-zinc-400">
            El modelo gratuito puede tardar ~30-40 segundos.
          </p>
        )}
        {error && <FormError>{error}</FormError>}
      </div>
    );
  }

  // Revisión editable
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          Revisá el plan importado
        </h3>
        <button
          onClick={cancel}
          className="text-zinc-400 hover:text-zinc-600"
          aria-label="Cancelar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        Verificá que el contenido coincida con tu plan y corregí lo que haga
        falta antes de guardar.
      </p>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={14}
        className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
      />

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Objetivos diarios{" "}
          <span className="font-normal text-zinc-400">
            {hadTargets
              ? "(detectados en el PDF — editables)"
              : "(no detectados — dejalos vacíos para usar el cálculo automático)"}
          </span>
        </p>
        <div className="grid grid-cols-4 gap-2">
          <TargetInput
            label="kcal"
            value={targets.kcal}
            onChange={(v) => setTargets((t) => ({ ...t, kcal: v }))}
          />
          <TargetInput
            label="Prot (g)"
            value={targets.protein}
            onChange={(v) => setTargets((t) => ({ ...t, protein: v }))}
          />
          <TargetInput
            label="Carb (g)"
            value={targets.carb}
            onChange={(v) => setTargets((t) => ({ ...t, carb: v }))}
          />
          <TargetInput
            label="Gras (g)"
            value={targets.fat}
            onChange={(v) => setTargets((t) => ({ ...t, fat: v }))}
          />
        </div>
      </div>

      {error && <FormError>{error}</FormError>}

      <button
        onClick={save}
        disabled={saving}
        className="h-11 rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Guardar plan importado"}
      </button>
    </div>
  );
}

function TargetInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500">
      {label}
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
    </label>
  );
}
