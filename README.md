# NutriAI

Aplicación web para seguimiento nutricional con foco en simplicidad:

- Onboarding de perfil para calcular objetivo diario.
- Registro de comidas manual o por foto con IA.
- Cálculo de kcal/macros consumidos y restantes del día.
- Registro y evolución de peso.
- Chat de nutrición acotado al dominio alimentario.

La app está orientada a uso personal/multiusuario simple, con aislamiento por usuario y autenticación con Google.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Auth.js / NextAuth v5 (Google OAuth)
- Drizzle ORM + Neon Postgres
- Tailwind CSS 4
- OpenRouter (SDK `openai`) para visión y texto

## Qué hace hoy (MVP)

- Login con Google.
- Flujo de onboarding para definir sexo, edad, altura, peso, actividad y objetivo.
- Cálculo de objetivo diario (kcal/macros) con fórmula Mifflin-St Jeor.
- Dashboard diario con:
	- Resumen de calorías consumidas/restantes.
	- Barras de macros (proteínas, carbos, grasas).
	- Listado de comidas del día.
	- Sugerencia de próxima comida.
	- Registro y gráfico de peso.
- Carga de comidas:
	- Manual.
	- Por foto (hasta 5 imágenes, análisis IA, edición antes de guardar).
- Chat nutricional con restricciones de seguridad y fuera de alcance bloqueado.

## Variables de entorno

Crear `.env.local` en la raíz con:

```bash
DATABASE_URL=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
OPENROUTER_API_KEY=
AI_VISION_MODEL=
AI_TEXT_MODEL=
```

Notas:

- `DATABASE_URL`: cadena de conexión a Neon (Postgres).
- `AI_VISION_MODEL`: debe soportar imágenes (muchos `:free` son solo texto).
- `AI_TEXT_MODEL`: modelo de texto para sugerencias y chat.

## Instalación

```bash
npm install
```

## Base de datos (Drizzle + Neon)

Generar migraciones y aplicarlas:

```bash
npm run db:generate
npm run db:migrate
```

Alternativas útiles:

```bash
npm run db:push
npm run db:studio
```

Seed de alimentos base (comunes AR):

```bash
npx tsx src/db/seed.ts
```

## Desarrollo

Levantar entorno local:

```bash
npm run dev
```

Abrir `http://localhost:3000`.

Rutas principales:

- `/login`
- `/onboarding`
- `/dashboard`
- `/dashboard/chat`
- `/dashboard/perfil`

## Scripts disponibles

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck

npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio

npm run test:vision <ruta-o-url-imagen>
npm run test:suggest
```

Scripts auxiliares:

```bash
npx tsx scripts/test-chat.ts
npx tsx scripts/add-weight.ts <email> <kg> [YYYY-MM-DD|ayer]
```

## Arquitectura (resumen)

1. La UI envía acciones al servidor (Server Actions / Route Handlers).
2. El backend consulta datos de usuario y perfil en Postgres vía Drizzle.
3. Para fotos, IA detecta alimentos/porciones y luego se cruzan con la base local para mejorar precisión nutricional.
4. El usuario puede editar resultados y confirmar guardado.
5. Targets diarios y progresión se recalculan en base al perfil y al peso más reciente.

## Seguridad y límites

- La app no reemplaza consejo médico.
- El chat está restringido a nutrición/alimentación.
- Los modelos gratuitos de IA pueden tener latencia y rate limits.
- La estimación por foto tiene error inherente: siempre revisar/editar antes de confirmar.

## Estructura del proyecto

```txt
src/
	app/
		dashboard/
		login/
		onboarding/
		api/auth/[...nextauth]/
	db/
	lib/
		ai/
		nutrition/
scripts/
drizzle/
```

## Próximos pasos sugeridos

- Ampliar seed nutricional (más alimentos y sinónimos).
- Mejorar matching alimento-DB y fallback cuando no hay match.
- Incorporar tests E2E del flujo foto -> edición -> guardado.
- Preparar despliegue en Vercel + Neon con variables por entorno.
