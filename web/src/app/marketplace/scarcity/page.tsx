import { prisma } from "@/lib/prisma";

const STATUS_CLASS: Record<string, string> = {
  AVAILABLE: "bg-emerald-500/20 border-emerald-400 text-emerald-800",
  RESERVED: "bg-amber-500/20 border-amber-400 text-amber-800",
  SOLD: "bg-rose-500/20 border-rose-400 text-rose-800",
  BLOCKED: "bg-slate-500/20 border-slate-400 text-slate-800",
};

export default async function ScarcityMapPage() {
  const zips = await prisma.zipInventory.findMany({
    orderBy: [{ state: "asc" }, { city: "asc" }, { zipCode: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-blue-950">Scarcity Map (Grid View)</h1>
        <p className="mt-2 text-sm text-blue-900/70">Green = available, yellow = reserved, red = sold.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {zips.map((zip) => (
          <div key={zip.id} className={`rounded-xl border p-4 ${STATUS_CLASS[zip.status]}`}>
            <p className="text-lg font-bold">{zip.zipCode}</p>
            <p className="text-sm">{zip.city}, {zip.state}</p>
            <p className="mt-1 text-xs font-semibold">{zip.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
