import { AlertCircle } from "lucide-react";

/**
 * Mensaje de error/aviso con diseño de alerta legible: fondo tenue, borde, ícono
 * y buen contraste tanto en light como en dark. Reemplaza al viejo
 * `<p className="text-sm text-red-600">` que quedaba poco legible.
 */
export default function FormError({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-snug text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 ${className}`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
