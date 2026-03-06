import { requireUser } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser("ADMIN");

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <DashboardNav role="ADMIN" />
      <div>{children}</div>
    </div>
  );
}
