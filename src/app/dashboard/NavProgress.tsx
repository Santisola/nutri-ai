"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";

type NavValue = { navigate: (href: string) => void; pending: boolean };

const NavContext = createContext<NavValue>({
  navigate: () => {},
  pending: false,
});

export const useNav = () => useContext(NavContext);

/**
 * Provee navegación con indicador de carga. Envuelve la navegación en una
 * transición de React y muestra una barra de progreso superior mientras la
 * sección destino se está cargando.
 */
export function NavProgress({ children }: { children: React.ReactNode }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const navigate = (href: string) => start(() => router.push(href));

  return (
    <NavContext.Provider value={{ navigate, pending }}>
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden transition-opacity duration-200 ${
          pending ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="h-full w-1/5 animate-[nav-progress_0.9s_ease-in-out_infinite] rounded-full bg-emerald-500" />
      </div>
      {children}
    </NavContext.Provider>
  );
}
