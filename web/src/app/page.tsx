import Link from "next/link";
import { ArrowRight, BarChart3, Lock, MapPinned, Sparkles } from "lucide-react";
import { AnimatedCard } from "@/components/animated-card";
import { getDashboardMetrics } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";

export default async function Home() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-8">
      <section className="card relative overflow-hidden px-8 py-12">
        <div className="absolute right-6 top-6 rounded-full bg-blue-50 p-3 text-blue-500">
          <Sparkles size={22} />
        </div>
        <p className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
          Premium ZIP Territory SaaS
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-blue-950 md:text-5xl">
          Claim exclusive ZIP territories before another agent does.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-blue-900/80">
          Manage inventory, contracts, onboarding, routing, and renewals in one platform. Local-first build with
          Docker so you can validate every flow before production cutover.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/marketplace" className="primary-btn inline-flex items-center gap-2">
            Explore Marketplace <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="secondary-btn inline-flex items-center gap-2">
            Sign In
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <AnimatedCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Total ZIPs</p>
          <p className="mt-2 text-3xl font-bold text-blue-950">{metrics.totalZips}</p>
        </AnimatedCard>
        <AnimatedCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Sold</p>
          <p className="mt-2 text-3xl font-bold text-blue-950">{metrics.soldZips}</p>
        </AnimatedCard>
        <AnimatedCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Available</p>
          <p className="mt-2 text-3xl font-bold text-blue-950">{metrics.availableZips}</p>
        </AnimatedCard>
        <AnimatedCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Revenue (Paid)</p>
          <p className="mt-2 text-3xl font-bold text-blue-950">{formatCurrency(metrics.totalRevenueCents)}</p>
        </AnimatedCard>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <AnimatedCard className="p-6">
          <Lock className="text-blue-600" />
          <h3 className="mt-3 text-lg font-semibold text-blue-950">True Exclusivity</h3>
          <p className="mt-2 text-sm text-blue-900/70">One active owner per ZIP in the vertical, with lifecycle audit logs.</p>
        </AnimatedCard>
        <AnimatedCard className="p-6">
          <MapPinned className="text-blue-600" />
          <h3 className="mt-3 text-lg font-semibold text-blue-950">Live Inventory</h3>
          <p className="mt-2 text-sm text-blue-900/70">Availability, reservations, waitlist, and release rules in one dashboard.</p>
        </AnimatedCard>
        <AnimatedCard className="p-6">
          <BarChart3 className="text-blue-600" />
          <h3 className="mt-3 text-lg font-semibold text-blue-950">Revenue Ops</h3>
          <p className="mt-2 text-sm text-blue-900/70">Payment, contract status, onboarding, renewal reminders, and dunning controls.</p>
        </AnimatedCard>
      </section>
    </div>
  );
}
