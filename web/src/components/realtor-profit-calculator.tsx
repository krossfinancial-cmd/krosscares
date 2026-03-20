"use client";

import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { ZIP_TIER_LABELS, ZIP_TIER_PRICE_DOLLARS, type ZipTierPriceKey } from "@/lib/pricing";

type TerritoryType = ZipTierPriceKey;

const SPLIT_PRESETS = [50, 70, 80, 90];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function clampNumber(value: number, min = 0, max = Number.POSITIVE_INFINITY) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function RealtorProfitCalculator() {
  const [homePrice, setHomePrice] = useState(400_000);
  const [commissionRate, setCommissionRate] = useState(2.5);
  const [agentSplit, setAgentSplit] = useState(70);
  const [territoryType, setTerritoryType] = useState<TerritoryType>("HIGH_DEMAND");
  const [dealsPerYear, setDealsPerYear] = useState(6);
  const [monthlyPortalSpend, setMonthlyPortalSpend] = useState(1_000);

  const results = useMemo(() => {
    const territoryCost = ZIP_TIER_PRICE_DOLLARS[territoryType] ?? 0;
    const grossCommission = homePrice * (commissionRate / 100);
    const agentCommission = grossCommission * (agentSplit / 100);
    const brokerCommission = grossCommission - agentCommission;
    const annualAgentIncome = agentCommission * dealsPerYear;
    const breakEvenDeals = agentCommission > 0 ? territoryCost / agentCommission : 0;
    const annualPortalSpend = monthlyPortalSpend * 12;
    const annualSavingsVsPortal = annualPortalSpend - territoryCost;
    const roiMultiple = territoryCost > 0 ? annualAgentIncome / territoryCost : 0;
    const territoryAsPercentOfOneDeal = agentCommission > 0 ? (territoryCost / agentCommission) * 100 : 0;

    return {
      territoryCost,
      grossCommission,
      agentCommission,
      brokerCommission,
      annualAgentIncome,
      breakEvenDeals,
      annualPortalSpend,
      annualSavingsVsPortal,
      roiMultiple,
      territoryAsPercentOfOneDeal,
    };
  }, [agentSplit, commissionRate, dealsPerYear, homePrice, monthlyPortalSpend, territoryType]);

  return (
    <section id="roi-calculator" className="card overflow-hidden p-7 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            ROI Calculator
          </p>
          <h2 className="mt-3 max-w-3xl text-2xl font-bold text-blue-950 md:text-3xl">
            See how fast one closing pays for your territory
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-blue-900/75 md:text-base">
            Compare your commission, your split, and your annual ROI in seconds.
          </p>
        </div>
        <p className="max-w-sm text-sm text-blue-900/70">
          Why fight 5 other agents for the same lead when one closing can pay for your exclusive territory several times over?
        </p>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5 md:p-6">
          <h3 className="text-lg font-semibold text-blue-950">Your numbers</h3>
          <p className="mt-1 text-sm text-blue-900/70">Adjust the inputs and the ROI updates instantly.</p>

          <div className="mt-6 space-y-5">
            <Field label="Home price">
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={homePrice}
                onChange={(event) => setHomePrice(clampNumber(Number(event.target.value)))}
                className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-blue-950"
              />
            </Field>

            <Field label="Commission rate (%)">
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                inputMode="decimal"
                value={commissionRate}
                onChange={(event) => setCommissionRate(clampNumber(Number(event.target.value), 0, 10))}
                className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-blue-950"
              />
            </Field>

            <Field label="Your commission split (%)">
              <div className="space-y-3 rounded-2xl border border-blue-200 bg-white px-4 py-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={agentSplit}
                  onChange={(event) => setAgentSplit(clampNumber(Number(event.target.value), 0, 100))}
                  className="w-full accent-blue-600"
                />
                <div className="flex flex-wrap gap-2">
                  {SPLIT_PRESETS.map((split) => (
                    <button
                      key={split}
                      type="button"
                      onClick={() => setAgentSplit(split)}
                      className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                        agentSplit === split
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-blue-200 bg-white text-blue-800 hover:border-blue-400"
                      }`}
                    >
                      {split}/{100 - split}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-blue-900/75">
                  You: <span className="font-semibold text-blue-950">{agentSplit}%</span> | Brokerage:{" "}
                  <span className="font-semibold text-blue-950">{100 - agentSplit}%</span>
                </p>
              </div>
            </Field>

            <Field label="Territory type">
              <select
                value={territoryType}
                onChange={(event) => setTerritoryType(event.target.value as TerritoryType)}
                className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-blue-950"
              >
                <option value="STANDARD">Standard - $520/year</option>
                <option value="HIGH_DEMAND">High Demand - $998/year</option>
                <option value="PREMIUM">Premium - $1,120/year</option>
              </select>
            </Field>

            <Field label="Deals closed per year">
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={dealsPerYear}
                onChange={(event) => setDealsPerYear(clampNumber(Number(event.target.value)))}
                className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-blue-950"
              />
            </Field>

            <Field label="Monthly spend on shared lead portals">
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={monthlyPortalSpend}
                onChange={(event) => setMonthlyPortalSpend(clampNumber(Number(event.target.value)))}
                className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-blue-950"
              />
              <p className="mt-2 text-xs text-blue-900/55">Example: Zillow, Realtor.com, or other recurring portal spend.</p>
            </Field>
          </div>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-white p-5 md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-950">Your results</h3>
              <p className="mt-1 text-sm text-blue-900/70">A single closing on an average home can cover your territory cost multiple times over.</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-semibold">Territory ROI</p>
              <p className="mt-1 text-2xl font-bold">{results.roiMultiple.toFixed(1)}x</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <StatCard label="Gross commission" value={formatCurrency(results.grossCommission)} />
            <StatCard label="Your commission" value={formatCurrency(results.agentCommission)} highlight />
            <StatCard label="Brokerage portion" value={formatCurrency(results.brokerCommission)} />
            <StatCard label={`${ZIP_TIER_LABELS[territoryType]} territory`} value={formatCurrency(results.territoryCost)} />
            <StatCard label="Annual commission income" value={formatCurrency(results.annualAgentIncome)} />
            <StatCard label="Break-even closings" value={results.breakEvenDeals.toFixed(2)} highlight />
            <StatCard label="Annual portal spend" value={formatCurrency(results.annualPortalSpend)} />
            <StatCard
              label="Savings vs portals"
              value={formatCurrency(results.annualSavingsVsPortal)}
              tone={results.annualSavingsVsPortal >= 0 ? "positive" : "neutral"}
            />
          </div>

          <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">What this means</p>
            <p className="mt-3 text-2xl font-bold text-blue-950">
              One closing earns you {formatCurrency(results.agentCommission)}.
            </p>
            <p className="mt-3 text-sm text-blue-900/75">
              Your {ZIP_TIER_LABELS[territoryType].toLowerCase()} territory costs{" "}
              <span className="font-semibold text-blue-950">{formatCurrency(results.territoryCost)}</span>, which is{" "}
              <span className="font-semibold text-blue-950">{results.territoryAsPercentOfOneDeal.toFixed(1)}%</span> of one closing.
            </p>
            <p className="mt-2 text-sm text-blue-900/75">
              At {dealsPerYear} deal{dealsPerYear === 1 ? "" : "s"} per year, that is a{" "}
              <span className="font-semibold text-blue-950">{results.roiMultiple.toFixed(1)}x</span> revenue-to-territory-cost multiple.
            </p>
          </div>

          <div className="mt-6 grid gap-3 rounded-3xl border border-blue-100 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 p-5 text-white md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Cost Comparison</p>
              <div className="mt-3 grid gap-2 text-sm text-blue-100/90">
                <p>Shared lead portals: recurring monthly spend of {formatCurrency(monthlyPortalSpend)}/month.</p>
                <p>Kross Concepts: one annual territory cost of {formatCurrency(results.territoryCost)}.</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Annual difference</p>
              <p className="mt-1 text-3xl font-bold">{formatCurrency(results.annualSavingsVsPortal)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/marketplace" className="primary-btn">
              Check ZIP Availability
            </Link>
            <Link href="/marketplace" className="secondary-btn">
              Reserve Your Territory
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-blue-950">{label}</span>
      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
  tone = "default",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "default" | "positive" | "neutral";
}) {
  const className = highlight
    ? "border-blue-700 bg-blue-700 text-white"
    : tone === "positive"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : "border-blue-100 bg-white text-blue-950";

  const mutedClassName = highlight ? "text-blue-100" : tone === "positive" ? "text-emerald-700" : "text-blue-900/60";

  return (
    <div className={`rounded-3xl border p-4 ${className}`}>
      <div className={`text-sm ${mutedClassName}`}>{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
