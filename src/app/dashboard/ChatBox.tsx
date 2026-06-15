"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Leaf } from "lucide-react";
import { sendChatMessage } from "./actions";
import type { ChatMessage } from "@/lib/ai/types";
import Markdown from "@/components/Markdown";

const MAX_LEN = 600;

type UIMessage = { role: "user" | "assistant"; content: string; time: string };

const SUGGESTIONS = [
  "Tengo ansiedad y quiero picotear algo a media mañana, ¿qué me conviene?",
  "¿Qué puedo cenar liviano si ya comí mucho al mediodía?",
  "Snacks con proteína fáciles para la oficina",
];

function now(): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export default function ChatBox() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    if (content.length > MAX_LEN) {
      setError(`Máximo ${MAX_LEN} caracteres.`);
      return;
    }
    setError(null);
    const next: UIMessage[] = [
      ...messages,
      { role: "user", content, time: now() },
    ];
    setMessages(next);
    setInput("");

    start(async () => {
      const history: ChatMessage[] = next.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await sendChatMessage(history);
      if (res.error || !res.reply) {
        setError(res.error ?? "Error al responder.");
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply!.answer, time: now() },
      ]);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Mensajes */}
      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-zinc-100/60 p-3 dark:bg-zinc-900/40">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
              <Leaf className="h-7 w-7" />
            </div>
            <p className="text-sm text-zinc-500">
              Preguntame lo que quieras sobre comida. Probá con:
            </p>
            <div className="flex w-full max-w-sm flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={pending}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-sm text-zinc-600 transition hover:border-emerald-400 hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-end gap-2 ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {m.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
                <Leaf className="h-4 w-4" />
              </div>
            )}
            <div
              className={`max-w-[78%] px-3 py-2 text-sm shadow-sm ${
                m.role === "user"
                  ? "rounded-2xl rounded-br-md bg-emerald-600 text-white"
                  : "rounded-2xl rounded-bl-md bg-white text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
              }`}
            >
              {m.role === "assistant" ? (
                <Markdown>{m.content}</Markdown>
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
              <span
                className={`mt-1 block text-right text-[10px] ${
                  m.role === "user" ? "text-white/70" : "text-zinc-400"
                }`}
              >
                {m.time}
              </span>
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex items-end gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
              <Leaf className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-bl-md bg-white px-3 py-3 dark:bg-zinc-800">
              <span className="flex gap-1">
                <Dot /> <Dot /> <Dot />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && <p className="px-1 pt-2 text-sm text-red-600">{error}</p>}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 pt-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Escribí tu consulta…"
          className="max-h-28 flex-1 resize-none rounded-3xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-40"
          aria-label="Enviar"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>

      <p className="pt-2 text-center text-[11px] text-zinc-400">
        Asistente acotado a nutrición. No es consejo médico.
      </p>
    </div>
  );
}

function Dot() {
  return (
    <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
  );
}
