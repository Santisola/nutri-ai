import { config } from "dotenv";

// Para scripts (tsx): Next.js carga .env.local automáticamente, pero los scripts
// no. Cargamos .env.local primero y .env como fallback (sin sobrescribir).
config({ path: ".env.local", quiet: true });
config({ quiet: true });
