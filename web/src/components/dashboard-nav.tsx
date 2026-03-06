import Link from "next/link";

type DashboardNavProps = {
  role: "ADMIN" | "REALTOR";
};

export function DashboardNav({ role }: DashboardNavProps) {
  const links =
    role === "ADMIN"
      ? [
          { href: "/dashboard/admin", label: "Overview" },
          { href: "/dashboard/admin/zips", label: "ZIP Inventory" },
          { href: "/dashboard/admin/clients", label: "Clients" },
          { href: "/dashboard/admin/renewals", label: "Renewals" },
        ]
      : [
          { href: "/dashboard/realtor", label: "Overview" },
          { href: "/dashboard/realtor/territories", label: "My Territories" },
          { href: "/dashboard/realtor/leads", label: "Leads" },
          { href: "/dashboard/realtor/routing", label: "Lead Routing" },
          { href: "/dashboard/realtor/billing", label: "Billing" },
        ];

  return (
    <aside className="card h-fit p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-600">
        {role === "ADMIN" ? "Admin Panel" : "Realtor Portal"}
      </p>
      <div className="space-y-2">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
