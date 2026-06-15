import type { VisionProvider, TextProvider } from "./types";
import { OpenRouterVisionProvider, OpenRouterTextProvider } from "./openrouter";

/**
 * Factory de proveedores IA. Hoy: OpenRouter (free). Para migrar a un modelo de
 * pago, agregar implementaciones (p. ej. GeminiVisionProvider) y elegirlas acá
 * según una env como AI_PROVIDER, sin tocar el resto de la app.
 */

export function getVisionProvider(): VisionProvider {
  return new OpenRouterVisionProvider();
}

export function getTextProvider(): TextProvider {
  return new OpenRouterTextProvider();
}

export * from "./types";
