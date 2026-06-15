import { redirect } from "next/navigation";
import { getCurrentUserId, getProfile } from "@/lib/queries";

export default async function Home() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const profile = await getProfile(userId);
  if (!profile) redirect("/onboarding");

  redirect("/dashboard");
}
