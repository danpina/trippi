import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminTabs from "@/components/AdminTabs";

// Everything under /admin requires an admin; the tabs are shared across its pages.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.isAdmin) redirect("/");

  return (
    <div className="max-w-5xl mx-auto px-6 pt-10 pb-14">
      <p className="eyebrow text-ember">Admin</p>
      <h1 className="font-display text-3xl font-medium text-ink mt-1 mb-6">Control panel</h1>
      <AdminTabs />
      {children}
    </div>
  );
}
