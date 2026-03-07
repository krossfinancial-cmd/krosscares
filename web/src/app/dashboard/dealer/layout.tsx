import { requireUser } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function DealerDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser("DEALER");

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <DashboardNav role="DEALER" />
      <div>{children}</div>
    </div>
  );
}
