"use client";

import { useRef, useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { sendChatMessage } from "./actions";
import type { ChatMessage } from "@/lib/ai/types";
import Markdown from "@/components/Markdown";

const MAX_LEN = 600;

const SUGGESTIONS = [
  "Tengo ansiedad y quiero picotear algo a media mañana, ¿qué me conviene?",
  "¿Qué puedo cenar liviano si ya comí mucho al mediodía?",
  "Snacks con proteína fáciles para la oficina",
];

export default function ChatBox() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    if (content.length > MAX_LEN) {
      setError(`Máximo ${MAX_LEN} caracteres.`);
      return;
    }
    setError(null);
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");

    start(async () => {
      const res = await sendChatMessage(next);
      if (res.error || !res.reply) {
        setError(res.error ?? "Error al responder.");
        // revertir el mensaje del usuario si falló del todo
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply!.answer },
      ]);
      requestAnimationFrame(() =>
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
      );
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
          <MessageCircle className="h-4 w-4 text-emerald-600" />
          Consultá lo que quieras (sobre comida)
        </h3>
        <p className="text-sm text-zinc-500">
          Dudas de alimentación, snacks, antojos, qué te conviene comer.
        </p>
      </div>

      {messages.length === 0 && (
        <div className="flex flex-col gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={pending}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm text-zinc-600 transition hover:border-emerald-400 hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div
          ref={listRef}
          className="flex max-h-80 flex-col gap-3 overflow-y-auto"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "self-end bg-emerald-600 text-white"
                  : "self-start bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              }`}
            >
              {m.role === "assistant" ? (
                <Markdown>{m.content}</Markdown>
              ) : (
                m.content
              )}
            </div>
          ))}
          {pending && (
            <div className="self-start rounded-2xl bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-800">
              <span className="inline-flex gap-1">
                <Dot /> <Dot /> <Dot />
              </span>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2"
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
          placeholder="Escribí tu consulta sobre comida…"
          className="flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          Enviar
        </button>
      </form>

      <p className="text-[11px] text-zinc-400">
        Asistente acotado a nutrición. No es consejo médico: ante dudas de salud,
        consultá a un profesional.
      </p>
    </div>
  );
}

function Dot() {
  return (
    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
  );
}
