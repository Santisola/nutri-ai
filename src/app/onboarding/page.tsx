import { redirect } from "next/navigation";
import { getCurrentUserId, getProfile } from "@/lib/queries";
import OnboardingFlow from "./OnboardingFlow";
import { saveProfile } from "./actions";

export default async function OnboardingPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  // Si ya tiene perfil, no rehacemos el onboarding.
  const profile = await getProfile(userId);
  if (profile) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-12">
      <OnboardingFlow action={saveProfile} />
    </main>
  );
}
