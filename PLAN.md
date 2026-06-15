# NutriAI — Plan de implementación

App web para generar planes nutricionales personalizados y hacer seguimiento del
objetivo de peso, con análisis de comidas por foto usando IA.

> Inspiración: Cal AI. Diferencia clave del MVP: las calorías/macros **no** las inventa
> el modelo — el modelo **identifica los alimentos y porciones**, y los números salen de
> una **base de datos nutricional real**.

---

## 1. Decisiones cerradas (entrevista técnica)

| Área | Decisión |
|---|---|
| Usuarios | Multi-user simple (yo + amigos/familia). Aislamiento de datos por usuario. |
| Auth | **Google OAuth** (Auth.js / NextAuth v5 + Drizzle adapter). |
| Estrategia IA | **Gratis ahora** (OpenRouter free vision model) con proveedor **abstraído** detrás de una interfaz, para migrar a pago (Gemini Flash / GPT-4o-mini) sin reescribir. |
| Plataforma | Web responsive (desktop + mobile, subir foto desde galería). |
| MVP | (1) Foto→macros, (2) Seguimiento diario, (3) Sugerencia próxima comida, (4) Onboarding + plan. |
| Nutrición | IA detecta alimentos+porciones → **base de datos da kcal/macros**. |
| Objetivo calórico | **Mifflin-St Jeor** en código (determinista) + disclaimer médico. |
| Stack | Next.js (App Router) + TypeScript + Drizzle ORM + Tailwind + Neon (Postgres). |
| Región | Argentina / español. Tabla de composición por alimento (Argenfoods/USDA) + Open Food Facts para envasados. |
| Fotos | **No se guardan**. Se procesa la imagen, se guarda solo el análisis. |
| Hosting | Vercel + Neon. |

---

## 2. Riesgos y advertencias (leer antes de invertir tiempo)

1. **Modelos free con visión = el cuello de botella real.**
   - Los modelos *realmente gratuitos* con visión en OpenRouter tienen **rate limits agresivos**
     (a veces ~pocas req/min, cuotas diarias) y **precisión baja** estimando porciones.
   - El modelo que mandaste (`nex-n2-pro:free`) hay que **verificar que soporte imágenes**;
     muchos free son solo texto. Si no, se cae toda la feature estrella.
   - **Mitigación arquitectónica:** proveedor IA abstraído (`VisionProvider`) + fallback a
     **carga manual** del alimento + diseño tolerante a fallos/timeouts.
2. **Estimación de porciones desde una foto es intrínsecamente imprecisa.** Incluso Cal AI (de pago) falla.
   Siempre dejamos **editar** lo detectado antes de confirmar.
3. **Datos nutricionales de comida casera argentina:** USDA es de EE.UU. y en inglés; Open Food Facts
   es fuerte en envasados pero débil en platos caseros. Para "fideos con crema" conviene una **tabla
   de composición por ingrediente** (Argenfoods). Estrategia: **seed propio** de alimentos comunes (por 100g).
4. **Salud ≠ consejo médico.** Disclaimer visible + no prometer resultados. Evitar manejar datos sensibles de más.
5. **Costo "cero" no es gratis infinito.** Vercel/Neon/Blob tienen free tiers con límites; el día que migres
   el modelo IA a pago, es centavos por foto pero deja de ser $0.

---

## 3. Arquitectura

```
Browser (Next.js RSC + Client components)
   │  upload foto (multipart) / acciones (Server Actions)
   ▼
Next.js App Router (Vercel)
   ├─ Auth.js (Google OAuth, sesión en Neon)
   ├─ Server Actions / Route Handlers
   ├─ lib/ai  ──────────► VisionProvider (OpenRouter free) ─► JSON {alimentos, gramos, confianza}
   │                      TextProvider   (OpenRouter free) ─► sugerencia de comida
   ├─ lib/nutrition ────► match alimento→DB, suma macros, Mifflin-St Jeor (targets)
   └─ Drizzle ──────────► Neon (Postgres)
```

### Pipeline "foto → macros"
1. Usuario sube foto (no se persiste; se manda como base64/URL temporal al modelo).
2. `VisionProvider.analyzeFoodImage()` → JSON estructurado: lista de `{ nombre, gramosEstimados, confianza }`.
3. Por cada alimento: `matchFood(nombre)` contra la tabla `foods` (Postgres `pg_trgm` / normalización).
   - Match claro → macros reales de la DB escalados por gramos.
   - Sin match → se usa el estimado del modelo, marcado `lowConfidence` (editable).
4. Se muestra el desglose **editable**. Usuario corrige gramos/alimentos y **confirma**.
5. Se guarda `meal_log` + `meal_log_items`. Se descarta la imagen.

### Pipeline "sugerencia de próxima comida"
1. Toma macros restantes del día (target − consumido) + preferencias/alergias/gustos del perfil.
2. `TextProvider.suggestMeal(context)` → 1-3 recetas prácticas y accesibles que cierren el día balanceado.
3. (Opcional v2) cruzar ingredientes de la receta con la DB para mostrar macros estimados.

---

## 4. Modelo de datos (Drizzle / Postgres en Neon)

- **auth** (manejadas por `@auth/drizzle-adapter`): `users`, `accounts`, `sessions`, `verificationTokens`.
- **profiles**: `userId` (FK), `sex`, `birthYear`, `heightCm`, `weightKg`, `activityLevel`
  (sedentary…veryActive), `goalType` (lose|maintain|gain), `goalRateKgPerWeek`, `targetWeightKg`,
  `dietaryPrefs` (jsonb), `allergies` (jsonb), `dislikes` (jsonb), `updatedAt`.
- **foods** (seed): `id`, `name`, `normalizedName`, `synonyms` (jsonb), `kcalPer100g`,
  `proteinPer100g`, `carbPer100g`, `fatPer100g`, `source`.
- **meal_logs**: `id`, `userId`, `date`, `mealType` (breakfast|lunch|dinner|snack), `note`,
  `kcal`, `protein`, `carb`, `fat`, `source` (ai|manual), `createdAt`.
- **meal_log_items**: `id`, `mealLogId` (FK), `foodId` (FK nullable), `label`, `grams`,
  `kcal`, `protein`, `carb`, `fat`, `confidence`.
- **weight_logs**: `id`, `userId`, `date`, `weightKg`.

Targets calóricos: se **calculan on-the-fly** desde `profiles` con Mifflin-St Jeor (no se persisten,
así no quedan desactualizados al cambiar el perfil).

---

## 5. Cálculo del objetivo (Mifflin-St Jeor) — determinista, sin IA

```
BMR (hombre)  = 10*peso + 6.25*altura − 5*edad + 5
BMR (mujer)   = 10*peso + 6.25*altura − 5*edad − 161
TDEE          = BMR * factorActividad   (1.2 … 1.9)
Objetivo kcal = TDEE ± déficit/superávit  (≈ 7700 kcal por kg → kg/semana → kcal/día)
Macros        = proteína g/kg de peso, grasa ~25-30% kcal, resto carbohidratos
```
Con piso de seguridad (no bajar de ~1200 kcal mujer / ~1500 hombre) y disclaimer médico.

---

## 6. Capa de IA abstraída (clave para migrar a pago)

`src/lib/ai/`:
- `types.ts` — interfaces `VisionProvider`, `TextProvider`, tipos de salida (`FoodDetection`).
- `openrouter.ts` — implementación usando el SDK `openai` apuntado a `https://openrouter.ai/api/v1`.
  Modelo configurable por env (`AI_VISION_MODEL`, `AI_TEXT_MODEL`).
- `index.ts` — factory que elige proveedor por env. **Para migrar a pago**: cambiar la env del modelo
  (o agregar `gemini.ts`) sin tocar el resto de la app.
- Prompt de visión devuelve **JSON estructurado estricto** (validado con Zod). Manejo de error/timeout/rate-limit.

---

## 7. Fases de desarrollo

**Fase 0 — Cimientos** *(en curso)*
- [x] Scaffold Next.js + TS + Tailwind + ESLint.
- [x] Dependencias (Drizzle, Auth.js, openai/OpenRouter, Zod).
- [ ] `drizzle.config.ts`, conexión Neon, `.env.example`.
- [ ] Schema completo + primera migración.
- [ ] Auth.js con Google + página de login.

**Fase 1 — Perfil y objetivo**
- [ ] Onboarding (form de datos + preferencias).
- [ ] Mifflin-St Jeor + pantalla de objetivo diario (kcal/macros) + disclaimer.

**Fase 2 — Seguimiento diario**
- [ ] Carga manual de comidas, dashboard del día (consumido vs objetivo), historial.
- [ ] Registro de peso + gráfico de progreso.

**Fase 3 — IA visión (feature estrella)**
- [ ] Seed de `foods` (alimentos comunes AR por 100g).
- [ ] Proveedor OpenRouter visión + validación + verificación de que el modelo free soporta imágenes.
- [ ] Flujo foto→detección→match DB→edición→confirmar.

**Fase 4 — Sugerencias IA**
- [ ] `suggestMeal` con macros restantes + preferencias.

**Fase 5 — Pulido y deploy**
- [ ] Responsive, estados de carga/error, rate-limit UX, deploy Vercel + Neon.

---

## 8. Variables de entorno

```
DATABASE_URL=               # Neon (Postgres) — connection string pooled
AUTH_SECRET=                # openssl rand -base64 32
AUTH_GOOGLE_ID=             # Google Cloud OAuth client id
AUTH_GOOGLE_SECRET=         # Google Cloud OAuth client secret
OPENROUTER_API_KEY=         # https://openrouter.ai/keys
AI_VISION_MODEL=            # ej: meta-llama/llama-3.2-11b-vision-instruct:free (VERIFICAR visión)
AI_TEXT_MODEL=              # ej: un modelo free de texto de OpenRouter
```

---

## 9. Decisiones a revisar en el futuro
- Migrar modelo de visión a pago barato cuando la precisión free no alcance.
- pgvector + embeddings para mejor matching alimento→DB (hoy: pg_trgm).
- PWA / cámara nativa si se quiere acercar más a Cal AI.
- Guardado opcional de fotos (Vercel Blob) si se quiere historial visual.
