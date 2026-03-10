"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

type Persona = "REALTOR" | "DEALER";

const CONTENT: Record<
  Persona,
  {
    label: string;
    headline: string;
    subheadline: string;
  }
> = {
  REALTOR: {
    label: "For Realtors",
    headline: "Own your ZIP. Get buyer-ready leads before other agents do.",
    subheadline:
      "We route motivated buyers from our credit-repair pipeline to one realtor per ZIP. Once claimed, it's off the market.",
  },
  DEALER: {
    label: "For Car Dealers",
    headline: "Own your ZIP. Get finance-ready buyers your team can close.",
    subheadline:
      "We route qualified credit-repair prospects to one dealership per ZIP so you stop competing for the same cold leads.",
  },
};

export function LandingHero() {
  const [persona, setPersona] = useState<Persona>("REALTOR");
  const content = useMemo(() => CONTENT[persona], [persona]);

  return (
    <section className="card relative overflow-hidden px-8 py-12">
      <div className="mb-5 inline-flex rounded-full bg-blue-50 p-1">
        {(["REALTOR", "DEALER"] as Persona[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setPersona(value)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              persona === value ? "bg-blue-600 text-white shadow-md" : "text-blue-700 hover:bg-blue-100"
            }`}
          >
            {CONTENT[value].label}
          </button>
        ))}
      </div>

      <p className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
        Exclusive ZIP Territories
      </p>

      <motion.h1
        key={`${persona}-headline`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="max-w-4xl text-4xl font-bold tracking-tight text-blue-950 md:text-5xl"
      >
        {content.headline}
      </motion.h1>

      <motion.p
        key={`${persona}-subheadline`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="mt-4 max-w-3xl text-lg text-blue-900/80"
      >
        {content.subheadline}
      </motion.p>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/marketplace" className="primary-btn inline-flex items-center gap-2">
          Check ZIP Availability <ArrowRight size={16} />
        </Link>
        <a href="mailto:krossfinancials@gmail.com?subject=Book%20Demo" className="secondary-btn inline-flex items-center gap-2">
          Book a Demo
        </a>
      </div>
      <p className="mt-3 text-xs text-blue-700/80">12-month territory term. Signed agreement required.</p>
    </section>
  );
}
