import { AnimatedCard } from "@/components/animated-card";
import { LandingHero } from "@/components/landing-hero";
import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { RealtorProfitCalculator } from "@/components/realtor-profit-calculator";
import { ZIP_TIER_LABELS, ZIP_TIER_PRICE_DOLLARS, type ZipTierPriceKey } from "@/lib/pricing";

const HOW_IT_WORKS = [
  {
    title: "Search your ZIP",
    description: "See live status, tier, and annual pricing in seconds.",
  },
  {
    title: "Reserve and secure it",
    description: "Complete checkout to lock the territory before someone else does.",
  },
  {
    title: "Sign and onboard",
    description: "Sign the agreement and submit routing details, headshot, and logo.",
  },
  {
    title: "Go live",
    description: "Leads are routed directly to your team for your active ZIP.",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Exclusive Territory",
    kross: { label: "Yes (1 agent per ZIP)", positive: true },
    zillow: { label: "No", positive: false },
    realtor: { label: "No", positive: false },
  },
  {
    feature: "Competition per Lead",
    kross: { label: "0" },
    zillow: { label: "5-10 agents" },
    realtor: { label: "3-6 agents" },
  },
  {
    feature: "Price Predictability",
    kross: { label: "Fixed yearly", positive: true },
    zillow: { label: "Bidding system", positive: false },
    realtor: { label: "Variable", positive: false },
  },
  {
    feature: "Lead Ownership",
    kross: { label: "Your territory", positive: true },
    zillow: { label: "Shared leads", positive: false },
    realtor: { label: "Shared leads", positive: false },
  },
  {
    feature: "Relationship Building",
    kross: { label: "Yes", positive: true },
    zillow: { label: "Lead race", positive: false },
    realtor: { label: "Lead race", positive: false },
  },
  {
    feature: "Cost Per Month",
    kross: { label: "$43-$93" },
    zillow: { label: "$500-$3,000" },
    realtor: { label: "$300-$1,500" },
  },
];

const BENEFITS = [
  {
    title: "True exclusivity",
    description: "One active partner per ZIP per vertical during the contract term.",
  },
  {
    title: "Higher-intent leads",
    description: "Prospects are already in a credit-improvement path with buying intent.",
  },
  {
    title: "Faster follow-up",
    description: "Lead routing by email/SMS to your preferred team destination.",
  },
  {
    title: "Predictable cost",
    description: "Simple annual territory pricing with renewal reminders.",
  },
];

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const PRICING_TIERS: ZipTierPriceKey[] = ["STANDARD", "HIGH_DEMAND", "PREMIUM"];

export default function Home() {
  return (
    <div className="space-y-8 pb-10">
      <LandingHero />

      <section className="card p-7 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Comparison</p>
        <h2 className="mt-3 max-w-3xl text-2xl font-bold text-blue-950 md:text-3xl">
          Why compete for leads, when you can own the territory
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-blue-900/75 md:text-base">
          Compare Kross Concepts against the platforms agents already know and see the difference between buying leads and
          controlling a market.
        </p>
        <div className="mt-6 space-y-4 md:hidden">
          {COMPARISON_ROWS.map((row) => (
            <AnimatedCard key={row.feature} className="overflow-hidden p-0">
              <div className="border-b border-blue-100 bg-blue-50/70 px-5 py-4">
                <h3 className="text-lg font-semibold text-blue-950">{row.feature}</h3>
              </div>
              <div className="grid gap-3 p-5">
                <ComparisonMobileRow label="Kross Concepts" emphasize>
                  <ComparisonCell {...row.kross} />
                </ComparisonMobileRow>
                <ComparisonMobileRow label="Zillow">
                  <ComparisonCell {...row.zillow} />
                </ComparisonMobileRow>
                <ComparisonMobileRow label="Realtor.com">
                  <ComparisonCell {...row.realtor} />
                </ComparisonMobileRow>
              </div>
            </AnimatedCard>
          ))}
        </div>
        <div className="mt-6 hidden overflow-x-auto rounded-[28px] border border-blue-100 bg-gradient-to-b from-white to-blue-50/40 shadow-[0_18px_36px_rgba(13,37,91,0.07)] md:block">
          <table className="min-w-[980px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-blue-50/80">
                <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Feature</th>
                <th className="bg-blue-600/5 px-6 py-5 text-left text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                  Kross Concepts
                </th>
                <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Zillow</th>
                <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Realtor.com</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr
                  key={row.feature}
                  className="group transition-all duration-200 hover:bg-blue-50/80 hover:shadow-[inset_0_1px_0_rgba(18,88,255,0.08)]"
                >
                  <td className="border-t border-blue-100 px-6 py-5 text-base font-semibold text-blue-950 transition-transform duration-200 group-hover:translate-x-0.5">
                    {row.feature}
                  </td>
                  <td className="border-t border-blue-100 bg-blue-600/[0.03] px-6 py-5 text-sm text-blue-900/75 transition-colors duration-200 group-hover:bg-blue-600/[0.06]">
                    <ComparisonCell {...row.kross} emphasize />
                  </td>
                  <td className="border-t border-blue-100 px-6 py-5 text-sm text-blue-900/75">
                    <ComparisonCell {...row.zillow} />
                  </td>
                  <td className="border-t border-blue-100 px-6 py-5 text-sm text-blue-900/75">
                    <ComparisonCell {...row.realtor} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="how-it-works" className="card p-7 md:p-8">
        <h2 className="text-2xl font-bold text-blue-950">How It Works</h2>
        <p className="mt-2 text-sm text-blue-900/70">From ZIP search to activation in four clear steps.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {HOW_IT_WORKS.map((item, index) => (
            <AnimatedCard key={item.title} className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Step {index + 1}</p>
              <h3 className="mt-2 text-lg font-semibold text-blue-950">{item.title}</h3>
              <p className="mt-2 text-sm text-blue-900/75">{item.description}</p>
            </AnimatedCard>
          ))}
        </div>
      </section>

      <RealtorProfitCalculator />

      <section id="benefits" className="card p-7 md:p-8">
        <h2 className="text-2xl font-bold text-blue-950">Why Teams Buy Territories</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {BENEFITS.map((item) => (
            <AnimatedCard key={item.title} className="p-5">
              <h3 className="text-lg font-semibold text-blue-950">{item.title}</h3>
              <p className="mt-2 text-sm text-blue-900/75">{item.description}</p>
            </AnimatedCard>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <AnimatedCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Realtor ROI Example</p>
          <h3 className="mt-2 text-xl font-bold text-blue-950">One home closing can cover your annual ZIP fee.</h3>
          <p className="mt-3 text-sm text-blue-900/75">
            Example: A $300,000 closing at a 3% side can outperform a $998 annual ZIP cost.
          </p>
        </AnimatedCard>
        <AnimatedCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Dealer ROI Example</p>
          <h3 className="mt-2 text-xl font-bold text-blue-950">One financed sale can cover your yearly territory.</h3>
          <p className="mt-3 text-sm text-blue-900/75">
            Example: A financed deal with ~$2,000 gross can outperform a $520-$1,120 annual ZIP cost.
          </p>
        </AnimatedCard>
      </section>

      <section id="pricing" className="card p-7 md:p-8">
        <h2 className="text-2xl font-bold text-blue-950">Pricing</h2>
        <p className="mt-2 text-sm text-blue-900/70">Annual pricing by territory demand and lead velocity.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <AnimatedCard key={tier} className="p-5">
              <p className="text-sm font-semibold text-blue-700">{ZIP_TIER_LABELS[tier]}</p>
              <p className="mt-2 text-3xl font-bold text-blue-950">{priceFormatter.format(ZIP_TIER_PRICE_DOLLARS[tier])}</p>
              <p className="text-sm text-blue-900/70">per year</p>
            </AnimatedCard>
          ))}
        </div>
      </section>

      <section id="faq" className="card p-7 md:p-8">
        <h2 className="text-2xl font-bold text-blue-950">FAQ</h2>
        <div className="mt-5 space-y-4">
          <AnimatedCard className="p-5">
            <h3 className="font-semibold text-blue-950">Is this really exclusive?</h3>
            <p className="mt-1 text-sm text-blue-900/75">Yes. One active partner per ZIP per vertical during the contract term.</p>
          </AnimatedCard>
          <AnimatedCard className="p-5">
            <h3 className="font-semibold text-blue-950">How long do I own a ZIP?</h3>
            <p className="mt-1 text-sm text-blue-900/75">12 months from activation, with renewal options.</p>
          </AnimatedCard>
          <AnimatedCard className="p-5">
            <h3 className="font-semibold text-blue-950">When do leads start?</h3>
            <p className="mt-1 text-sm text-blue-900/75">After payment, signed agreement, and completed onboarding.</p>
          </AnimatedCard>
          <AnimatedCard className="p-5">
            <h3 className="font-semibold text-blue-950">What if my ZIP is sold?</h3>
            <p className="mt-1 text-sm text-blue-900/75">Join the waitlist and we will notify you if it reopens.</p>
          </AnimatedCard>
        </div>
      </section>

      <section id="final-cta" className="card p-8 text-center">
        <h2 className="text-3xl font-bold text-blue-950">Check if your ZIP is still available</h2>
        <p className="mt-2 text-sm text-blue-900/75">If it is open, claim it before another team does.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a href="/marketplace" className="primary-btn">
            Check ZIP Availability
          </a>
          <a href="mailto:krossfinancials@gmail.com?subject=Talk%20to%20Sales" className="secondary-btn">
            Talk to Sales
          </a>
        </div>
      </section>
    </div>
  );
}

function ComparisonCell({
  label,
  positive,
  emphasize = false,
}: {
  label: string;
  positive?: boolean;
  emphasize?: boolean;
}) {
  if (positive === undefined) {
    return <span className={`text-base ${emphasize ? "font-semibold text-blue-950" : "text-blue-950"}`}>{label}</span>;
  }

  const Icon = positive ? Check : X;
  const iconClassName = positive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500";

  return (
    <span className={`inline-flex items-center gap-2 text-base text-blue-950 transition-transform duration-200 ${emphasize ? "font-semibold" : ""}`}>
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md shadow-sm ${iconClassName}`}>
        <Icon size={18} strokeWidth={2.5} />
      </span>
      <span>{label}</span>
    </span>
  );
}

function ComparisonMobileRow({
  label,
  emphasize = false,
  children,
}: {
  label: string;
  emphasize?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${emphasize ? "border-blue-200 bg-blue-50/70" : "border-blue-100 bg-white/90"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
