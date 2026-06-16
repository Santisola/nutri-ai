"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { RefreshCw, MessageCircle, Sparkles, FileCheck } from "lucide-react";
import { generateMyPlan } from "./actions";
import ImportPdf from "./ImportPdf";
import Markdown from "@/components/Markdown";

const LOADING = [
  "Analizando tu objetivo…",
  "Eligiendo alimentos según tus gustos…",
  "Armando la distribución del día…",
  "Redactando tu guía…",
];

export default function PlanView({
  initialContent,
  initialSource,
  updatedAt,
}: {
  initialContent: string | null;
  initialSource?: "generated" | "imported";
  updatedAt?: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [source, setSource] = useState<"generated" | "imported">(
    initialSource ?? "generated"
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [step, setStep] = useState(0);
  const autoTried = useRef(false);

  function generate() {
    setError(null);
    setStep(0);
    start(async () => {
      const res = await generateMyPlan();
      if (res.error || !res.content) {
        setError(res.error ?? "No se pudo generar.");
        return;
      }
      setContent(res.content);
      setSource("generated");
    });
  }

  function onImported(newContent: string) {
    setContent(newContent);
    setSource("imported");
  }

  // Genera automáticamente la primera vez si todavía no hay plan.
  useEffect(() => {
    if (!content && !autoTried.current) {
      autoTried.current = true;
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, LOADING.length - 1)),
      5000
    );
    return () => clearInterval(id);
  }, [pending]);

  if (pending) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="font-medium text-zinc-800 dark:text-zinc-100">
          {LOADING[step]}
        </p>
        <p className="text-xs text-zinc-400">
          El modelo gratuito puede tardar ~30 segundos.
        </p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="max-w-xs text-sm text-zinc-500">
          Generá tu guía de alimentación personalizada para alcanzar tu objetivo.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={generate}
          className="h-11 rounded-full bg-emerald-600 px-6 font-medium text-white transition hover:bg-emerald-700"
        >
          Generar mi plan
        </button>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="h-px w-8 bg-zinc-200 dark:bg-zinc-700" /> o{" "}
          <span className="h-px w-8 bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <ImportPdf variant="secondary" onSaved={onImported} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {source === "imported" && (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          <FileCheck className="h-3.5 w-3.5" />
          Importado de tu nutricionista
        </span>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <Markdown>{content}</Markdown>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/dashboard/chat"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" />
          Ajustar mi plan por chat
        </Link>
        <button
          onClick={generate}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <RefreshCw className="h-4 w-4" />
          Regenerar con IA
        </button>
      </div>

      <ImportPdf variant="secondary" onSaved={onImported} />

      {updatedAt && (
        <p className="text-xs text-zinc-400">Actualizado el {updatedAt}.</p>
      )}
    </div>
  );
}
