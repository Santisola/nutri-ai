import ChatBox from "../ChatBox";

export default function ChatPage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Asistente de nutrición
        </h1>
        <p className="text-sm text-zinc-500">
          Consultá dudas sobre comidas, snacks, antojos o qué te conviene comer.
        </p>
      </header>
      <ChatBox />
    </div>
  );
}
