import { createClient } from "npm:@supabase/supabase-js@2.50.0";
import Stripe from "npm:stripe@20.4.0";

/**
 * Deploy from /Users/jeanpierre-louis/Desktop/kc/web:
 *   supabase functions deploy stripe-webhook --project-ref <project-ref> --no-verify-jwt
 *
 * Register this Stripe webhook URL in the Stripe Dashboard:
 *   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
 *
 * Local testing endpoint:
 *   http://127.0.0.1:54321/functions/v1/stripe-webhook
 */

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required.");
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
  httpClient: Stripe.createFetchHttpClient(),
  maxNetworkRetries: 2,
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const JSON_HEADERS = {
  "content-type": "application/json",
};

const HANDLED_EVENT_TYPES = new Set([
  "invoice.paid",
  "payment_intent.succeeded",
  "charge.succeeded",
]);

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

type JsonObject = { [key: string]: JsonValue };

type InvoicePaymentStatus = "pending" | "paid" | "failed" | "refunded" | "unknown";

type StripeEventRow = {
  stripe_event_id: string;
  event_type: string;
  livemode: boolean;
  api_version: string | null;
  object_id: string | null;
  payload: JsonObject;
  processed_at: string;
};

type InvoicePaymentRow = {
  id: string | number;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  customer_email: string | null;
  currency: string | null;
  amount_paid: number | null;
  status: InvoicePaymentStatus;
  paid_at: string | null;
  raw_source: JsonObject;
  created_at: string;
  updated_at: string;
};

type InvoicePaymentWrite = Omit<InvoicePaymentRow, "id" | "created_at" | "updated_at">;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function log(level: "info" | "error", message: string, details: Record<string, unknown> = {}) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...details,
  };

  const serialized = JSON.stringify(payload);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  console.log(serialized);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJsonObject(value: unknown): JsonObject {
  return isObject(value) ? (value as JsonObject) : {};
}

function getProp(value: unknown, key: string): unknown {
  return isObject(value) ? value[key] : null;
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getNested(value: unknown, ...keys: string[]): unknown {
  let current: unknown = value;

  for (const key of keys) {
    if (!isObject(current)) {
      return null;
    }

    current = current[key];
  }

  return current;
}

function getExpandableId(value: unknown): string | null {
  return getString(value) ?? getString(getProp(value, "id"));
}

function firstNonNull<T>(...values: Array<T | null | undefined>) {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      return value;
    }
  }

  return null;
}

function normalizeEmail(value: unknown) {
  const email = getString(value);
  return email ? email.toLowerCase() : null;
}

function normalizeCurrency(value: unknown) {
  const currency = getString(value);
  return currency ? currency.toLowerCase() : null;
}

function toIsoFromUnix(value: unknown) {
  const seconds = getNumber(value);

  if (seconds === null) {
    return null;
  }

  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildStripeEventRow(event: Stripe.Event): StripeEventRow {
  const rawObject = toJsonObject(event.data.object);

  return {
    stripe_event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    api_version: event.api_version ?? null,
    object_id: getString(rawObject.id),
    payload: toJsonObject(event as unknown),
    processed_at: new Date().toISOString(),
  };
}

function buildInvoicePaymentWrite(event: Stripe.Event): InvoicePaymentWrite | null {
  const rawObject = toJsonObject(event.data.object);

  if (event.type === "invoice.paid") {
    const paidAt = firstNonNull(
      toIsoFromUnix(getNested(rawObject, "status_transitions", "paid_at")),
      toIsoFromUnix(rawObject.created),
      toIsoFromUnix(event.created),
    );

    return {
      stripe_invoice_id: getString(rawObject.id),
      stripe_payment_intent_id: getExpandableId(rawObject.payment_intent),
      stripe_charge_id: getExpandableId(rawObject.charge),
      customer_email: firstNonNull(
        normalizeEmail(rawObject.customer_email),
        normalizeEmail(getNested(rawObject, "customer", "email")),
      ),
      currency: normalizeCurrency(rawObject.currency),
      amount_paid: firstNonNull(getNumber(rawObject.amount_paid), getNumber(rawObject.total)),
      status: "paid",
      paid_at: paidAt,
      raw_source: rawObject,
    };
  }

  if (event.type === "payment_intent.succeeded") {
    const firstCharge = getArray(getNested(rawObject, "charges", "data"))[0];

    return {
      stripe_invoice_id: getExpandableId(rawObject.invoice),
      stripe_payment_intent_id: getString(rawObject.id),
      stripe_charge_id: firstNonNull(
        getExpandableId(rawObject.latest_charge),
        getExpandableId(firstCharge),
      ),
      customer_email: firstNonNull(
        normalizeEmail(rawObject.receipt_email),
        normalizeEmail(getNested(firstCharge, "billing_details", "email")),
        normalizeEmail(getNested(firstCharge, "receipt_email")),
      ),
      currency: normalizeCurrency(rawObject.currency),
      amount_paid: firstNonNull(
        getNumber(rawObject.amount_received),
        getNumber(rawObject.amount),
      ),
      status: "paid",
      paid_at: firstNonNull(toIsoFromUnix(rawObject.created), toIsoFromUnix(event.created)),
      raw_source: rawObject,
    };
  }

  if (event.type === "charge.succeeded") {
    return {
      stripe_invoice_id: getExpandableId(rawObject.invoice),
      stripe_payment_intent_id: getExpandableId(rawObject.payment_intent),
      stripe_charge_id: getString(rawObject.id),
      customer_email: firstNonNull(
        normalizeEmail(getNested(rawObject, "billing_details", "email")),
        normalizeEmail(rawObject.receipt_email),
      ),
      currency: normalizeCurrency(rawObject.currency),
      amount_paid: firstNonNull(
        getNumber(rawObject.amount_captured),
        getNumber(rawObject.amount),
      ),
      status: "paid",
      paid_at: firstNonNull(toIsoFromUnix(rawObject.created), toIsoFromUnix(event.created)),
      raw_source: rawObject,
    };
  }

  return null;
}

async function findStripeEventById(stripeEventId: string) {
  const { data, error } = await supabase
    .from("stripe_events")
    .select("stripe_event_id")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check stripe_events for duplicates: ${error.message}`);
  }

  return data;
}

async function claimStripeEvent(stripeEvent: StripeEventRow) {
  const { error } = await supabase.from("stripe_events").insert(stripeEvent);

  if (!error) {
    log("info", "stripe_webhook.successful_insert", {
      stripe_event_id: stripeEvent.stripe_event_id,
      event_type: stripeEvent.event_type,
      object_id: stripeEvent.object_id,
    });
    return { duplicate: false as const };
  }

  if (error.code === "23505") {
    log("info", "stripe_webhook.duplicate_event", {
      stripe_event_id: stripeEvent.stripe_event_id,
      event_type: stripeEvent.event_type,
      reason: "unique_constraint",
    });
    return { duplicate: true as const };
  }

  throw new Error(`Failed to insert stripe_events row: ${error.message}`);
}

async function releaseStripeEventClaim(stripeEventId: string) {
  const { error } = await supabase.from("stripe_events").delete().eq("stripe_event_id", stripeEventId);

  if (error) {
    log("error", "stripe_webhook.failed_to_release_claim", {
      stripe_event_id: stripeEventId,
      error: error.message,
    });
  }
}

async function findInvoicePaymentByColumn(column: "stripe_invoice_id" | "stripe_payment_intent_id" | "stripe_charge_id", value: string | null) {
  if (!value) {
    return null;
  }

  const { data, error } = await supabase
    .from("invoice_payments")
    .select("*")
    .eq(column, value)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up invoice_payments by ${column}: ${error.message}`);
  }

  return data as InvoicePaymentRow | null;
}

async function findMatchingInvoicePayment(next: InvoicePaymentWrite) {
  const byInvoice = await findInvoicePaymentByColumn("stripe_invoice_id", next.stripe_invoice_id);
  if (byInvoice) return byInvoice;

  const byPaymentIntent = await findInvoicePaymentByColumn(
    "stripe_payment_intent_id",
    next.stripe_payment_intent_id,
  );
  if (byPaymentIntent) return byPaymentIntent;

  return await findInvoicePaymentByColumn("stripe_charge_id", next.stripe_charge_id);
}

function mergeInvoicePayment(existing: InvoicePaymentRow, next: InvoicePaymentWrite): InvoicePaymentWrite {
  return {
    stripe_invoice_id: firstNonNull(next.stripe_invoice_id, existing.stripe_invoice_id),
    stripe_payment_intent_id: firstNonNull(
      next.stripe_payment_intent_id,
      existing.stripe_payment_intent_id,
    ),
    stripe_charge_id: firstNonNull(next.stripe_charge_id, existing.stripe_charge_id),
    customer_email: firstNonNull(next.customer_email, existing.customer_email),
    currency: firstNonNull(next.currency, existing.currency),
    amount_paid: firstNonNull(next.amount_paid, existing.amount_paid),
    status: next.status ?? existing.status ?? "unknown",
    paid_at: firstNonNull(next.paid_at, existing.paid_at),
    raw_source: next.raw_source,
  };
}

async function insertInvoicePayment(next: InvoicePaymentWrite) {
  const { data, error } = await supabase
    .from("invoice_payments")
    .insert(next)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as InvoicePaymentRow;
}

async function updateInvoicePayment(id: string | number, next: InvoicePaymentWrite) {
  const { data, error } = await supabase
    .from("invoice_payments")
    .update(next)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as InvoicePaymentRow;
}

async function upsertInvoicePayment(next: InvoicePaymentWrite, event: Stripe.Event) {
  const existing = await findMatchingInvoicePayment(next);

  if (existing) {
    const updated = await updateInvoicePayment(existing.id, mergeInvoicePayment(existing, next));

    log("info", "stripe_webhook.successful_upsert", {
      stripe_event_id: event.id,
      event_type: event.type,
      mode: "update",
      invoice_payment_id: updated.id,
      stripe_invoice_id: updated.stripe_invoice_id,
      stripe_payment_intent_id: updated.stripe_payment_intent_id,
      stripe_charge_id: updated.stripe_charge_id,
    });

    return updated;
  }

  try {
    const inserted = await insertInvoicePayment(next);

    log("info", "stripe_webhook.successful_upsert", {
      stripe_event_id: event.id,
      event_type: event.type,
      mode: "insert",
      invoice_payment_id: inserted.id,
      stripe_invoice_id: inserted.stripe_invoice_id,
      stripe_payment_intent_id: inserted.stripe_payment_intent_id,
      stripe_charge_id: inserted.stripe_charge_id,
    });

    return inserted;
  } catch (error) {
    if (isObject(error) && getString(error.code) === "23505") {
      const concurrent = await findMatchingInvoicePayment(next);

      if (!concurrent) {
        throw new Error(`invoice_payments conflict detected but row could not be reloaded for ${event.id}`);
      }

      const updated = await updateInvoicePayment(concurrent.id, mergeInvoicePayment(concurrent, next));

      log("info", "stripe_webhook.successful_upsert", {
        stripe_event_id: event.id,
        event_type: event.type,
        mode: "update_after_conflict",
        invoice_payment_id: updated.id,
        stripe_invoice_id: updated.stripe_invoice_id,
        stripe_payment_intent_id: updated.stripe_payment_intent_id,
        stripe_charge_id: updated.stripe_charge_id,
      });

      return updated;
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`Unknown invoice_payments upsert error for ${event.id}`);
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, {
      ok: false,
      message: "Method not allowed. Use POST.",
    });
  }

  const signature = request.headers.get("Stripe-Signature");

  if (!signature) {
    log("error", "stripe_webhook.signature_verification_failure", {
      reason: "missing_signature_header",
    });

    return jsonResponse(400, {
      ok: false,
      message: "Missing Stripe-Signature header.",
    });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider,
    );
  } catch (error) {
    log("error", "stripe_webhook.signature_verification_failure", {
      reason: "construct_event_failed",
      error: error instanceof Error ? error.message : String(error),
    });

    return jsonResponse(400, {
      ok: false,
      message: "Stripe signature verification failed.",
    });
  }

  try {
    const existingEvent = await findStripeEventById(event.id);

    if (existingEvent) {
      log("info", "stripe_webhook.duplicate_event", {
        stripe_event_id: event.id,
        event_type: event.type,
        reason: "existing_row",
      });

      return jsonResponse(200, {
        ok: true,
        message: "already processed",
        stripe_event_id: event.id,
        event_type: event.type,
      });
    }

    const stripeEventRow = buildStripeEventRow(event);
    const claim = await claimStripeEvent(stripeEventRow);

    if (claim.duplicate) {
      return jsonResponse(200, {
        ok: true,
        message: "already processed",
        stripe_event_id: event.id,
        event_type: event.type,
      });
    }

    if (!HANDLED_EVENT_TYPES.has(event.type)) {
      log("info", "stripe_webhook.unhandled_event_type", {
        stripe_event_id: event.id,
        event_type: event.type,
      });

      return jsonResponse(200, {
        ok: true,
        message: "Event logged but not handled.",
        stripe_event_id: event.id,
        event_type: event.type,
      });
    }

    const invoicePayment = buildInvoicePaymentWrite(event);

    if (!invoicePayment) {
      await releaseStripeEventClaim(event.id);

      log("error", "stripe_webhook.processing_failure", {
        stripe_event_id: event.id,
        event_type: event.type,
        reason: "invoice_payment_payload_missing",
      });

      return jsonResponse(500, {
        ok: false,
        message: `Unable to build invoice payment payload for ${event.type}.`,
        stripe_event_id: event.id,
      });
    }

    const saved = await upsertInvoicePayment(invoicePayment, event);

    return jsonResponse(200, {
      ok: true,
      message: "Event processed successfully.",
      stripe_event_id: event.id,
      event_type: event.type,
      invoice_payment_id: saved.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";

    await releaseStripeEventClaim(event.id);

    log("error", "stripe_webhook.processing_failure", {
      stripe_event_id: event.id,
      event_type: event.type,
      error: message,
    });

    return jsonResponse(500, {
      ok: false,
      message,
      stripe_event_id: event.id,
      event_type: event.type,
    });
  }
});
