import { Leaf } from "lucide-react";
import ChatBox from "../ChatBox";

export default function ChatPage() {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-4 pb-3 pt-2">
      {/* Header slim estilo chat */}
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
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
