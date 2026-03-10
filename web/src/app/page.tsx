import { AnimatedCard } from "@/components/animated-card";
import { LandingHero } from "@/components/landing-hero";

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
    category: "Exclusivity",
    traditional: "Multiple agents can work the same lead or ZIP at the same time.",
    territory: "One active partner per ZIP and vertical during the contract term.",
  },
  {
    category: "Lead flow",
    traditional: "You keep buying one lead at a time and hope speed wins.",
    territory: "Qualified prospects route to your team for the ZIP you control.",
  },
  {
    category: "Competition",
    traditional: "You are competing against other buyers for the same demand.",
    territory: "You secure the market instead of chasing the same shoppers.",
  },
  {
    category: "Cost model",
    traditional: "Variable spend can rise as competition increases.",
    territory: "Simple annual territory pricing with predictable renewal timing.",
  },
  {
    category: "Brand position",
    traditional: "You rent attention inside someone else's marketplace.",
    territory: "You become the designated local recipient for your territory.",
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
          Traditional lead marketplaces sell access. Territories give your team a defined lane with exclusive ZIP coverage.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-blue-100 bg-white">
            <thead>
              <tr className="bg-blue-50/80">
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-blue-700">Category</th>
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Traditional lead platforms
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Kross Concepts territories
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, index) => (
                <tr key={row.category} className={index % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                  <td className="border-t border-blue-100 px-4 py-4 text-sm font-semibold text-blue-950">{row.category}</td>
                  <td className="border-t border-blue-100 px-4 py-4 text-sm text-blue-900/75">{row.traditional}</td>
                  <td className="border-t border-blue-100 px-4 py-4 text-sm text-blue-900/75">{row.territory}</td>
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
            Example: A $300,000 closing at a 3% side can outperform a $1,000 annual ZIP cost.
          </p>
        </AnimatedCard>
        <AnimatedCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Dealer ROI Example</p>
          <h3 className="mt-2 text-xl font-bold text-blue-950">One financed sale can cover your yearly territory.</h3>
          <p className="mt-3 text-sm text-blue-900/75">
            Example: A financed deal with ~$2,000 gross can outperform a $750–$1,500 annual ZIP cost.
          </p>
        </AnimatedCard>
      </section>

      <section id="pricing" className="card p-7 md:p-8">
        <h2 className="text-2xl font-bold text-blue-950">Pricing</h2>
        <p className="mt-2 text-sm text-blue-900/70">Annual pricing by territory demand and lead velocity.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <AnimatedCard className="p-5">
            <p className="text-sm font-semibold text-blue-700">Rural</p>
            <p className="mt-2 text-3xl font-bold text-blue-950">$550</p>
            <p className="text-sm text-blue-900/70">per year</p>
          </AnimatedCard>
          <AnimatedCard className="p-5">
            <p className="text-sm font-semibold text-blue-700">Standard</p>
            <p className="mt-2 text-3xl font-bold text-blue-950">$1,000</p>
            <p className="text-sm text-blue-900/70">per year</p>
          </AnimatedCard>
          <AnimatedCard className="p-5">
            <p className="text-sm font-semibold text-blue-700">Premium</p>
            <p className="mt-2 text-3xl font-bold text-blue-950">$1,200</p>
            <p className="text-sm text-blue-900/70">per year</p>
          </AnimatedCard>
        </div>
      </section>

      <section className="card p-7 md:p-8">
        <h2 className="text-2xl font-bold text-blue-950">Built for Accountability</h2>
        <ul className="mt-4 space-y-2 text-sm text-blue-900/80">
          <li>Exclusivity guarantee: no second active partner in the same ZIP/vertical.</li>
          <li>Lead validity guarantee: invalid leads replaced under policy terms.</li>
          <li>Delivery standard: credit/extension terms apply if minimum delivery terms are missed.</li>
        </ul>
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
