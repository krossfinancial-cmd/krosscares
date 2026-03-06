"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ZipActionButtonProps = {
  zipId: string;
  zipCode: string;
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";
};

export function ZipActionButton({ zipId, zipCode, status }: ZipActionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const reserve = async () => {
    setLoading(true);
    const response = await fetch("/api/zips/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zipId }),
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      if (payload.redirect) {
        router.push(payload.redirect);
        return;
      }
      alert(payload.error || "Unable to reserve ZIP.");
      return;
    }

    router.push(`/dashboard/realtor/checkout/${zipId}`);
    router.refresh();
  };

  if (status !== "AVAILABLE") {
    return (
      <button className="secondary-btn text-xs" onClick={() => router.push(`/waitlist?zip=${zipCode}`)}>
        Join Waitlist
      </button>
    );
  }

  return (
    <button onClick={reserve} className="primary-btn text-xs" disabled={loading}>
      {loading ? "Reserving..." : "Claim Territory"}
    </button>
  );
}
