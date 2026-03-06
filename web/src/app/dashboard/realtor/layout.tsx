import { requireUser } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function RealtorDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser("REALTOR");

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <DashboardNav role="REALTOR" />
      <div>{children}</div>
    </div>
  );
}
