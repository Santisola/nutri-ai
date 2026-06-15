import { Leaf } from "lucide-react";
import ChatBox from "../ChatBox";

export default function ChatPage() {
  // Rompe el padding del <main> del layout para ocupar todo el alto disponible
  // (debajo del header), dejando lugar abajo para la nav en mobile.
  return (
    <div className="-mx-5 -mb-28 -mt-6 flex h-[calc(100dvh-3.5rem)] flex-col px-4 pb-16 pt-2 md:-mb-12 md:pb-3">
      {/* Header slim estilo chat */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
          <Leaf className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Asistente NutriAI
        </p>
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-2">
        <ChatBox />
      </div>
    </div>
  );
}
