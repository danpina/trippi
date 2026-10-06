import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");

  return (
    <SettingsForm
      user={{ name: user.name, email: user.email, age: user.age, gender: user.gender }}
    />
  );
}

export const metadata: Metadata = { title: "Settings" };
