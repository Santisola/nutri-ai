import { redirect } from "next/navigation";
import { getCurrentUserId, getProfile } from "@/lib/queries";
import ProfileForm from "@/components/ProfileForm";
import { saveProfile } from "./actions";

export default async function OnboardingPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  // Si ya tiene perfil, no rehacemos el onboarding.
  const profile = await getProfile(userId);
  if (profile) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Contanos sobre vos
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Con estos datos calculamos tu objetivo calórico diario y tus macros.
        </p>
      </header>

      <ProfileForm action={saveProfile} submitLabel="Calcular mi objetivo" />

      <p className="text-xs text-zinc-400">
        Cálculo basado en la ecuación de Mifflin-St Jeor. No es consejo médico.
      </p>
    </main>
  );
}
