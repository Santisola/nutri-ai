"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

// Soporte del Web Speech API, vía useSyncExternalStore: snapshot del server =
// false, del cliente = lo que tenga el navegador. Evita setState-en-effect y el
// mismatch de hidratación (el botón de micrófono aparece recién en el cliente).
const subscribe = () => () => {};
const getSupported = () =>
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);
const getServerSupported = () => false;

/**
 * Wrapper del Web Speech API para dictado por voz. Transcribe en el navegador
 * (sin costo de IA) y entrega cada segmento finalizado por callback. Soporte:
 * Chrome/Edge/Android muy bueno; Firefox sin soporte; Safari/iOS limitado. Cuando
 * no hay soporte, `supported` es false y el caller oculta el botón de micrófono.
 */
export function useSpeechToText(lang = "es-AR") {
  const supported = useSyncExternalStore(
    subscribe,
    getSupported,
    getServerSupported
  );
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);
  const onTextRef = useRef<(chunk: string) => void>(() => {});

  // Cancelamos cualquier sesión activa al desmontar.
  useEffect(() => () => recRef.current?.abort(), []);

  const start = useCallback(
    (onText: (chunk: string) => void) => {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Ctor) return;
      // Si ya había una sesión activa, la cerramos antes de abrir otra.
      recRef.current?.abort();

      onTextRef.current = onText;
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = false;
      rec.onresult = (e) => {
        let chunk = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) chunk += res[0].transcript;
        }
        chunk = chunk.trim();
        if (chunk) onTextRef.current(chunk);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    },
    [lang]
  );

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, start, stop };
}
