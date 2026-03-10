import { DashboardNav } from "@/components/dashboard-nav";
import { requireUser } from "@/lib/auth";
import { isDatabaseUnavailableError } from "@/lib/database-errors";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  try {
    await requireUser("ADMIN");
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) {
      throw error;
    }

    console.error("Admin dashboard auth lookup failed because the database is unavailable.", error);

    return (
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-blue-950">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-blue-900/70">Admin tools are temporarily unavailable while the database reconnects.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <DashboardNav role="ADMIN" />
      <div>{children}</div>
    </div>
  );
}
