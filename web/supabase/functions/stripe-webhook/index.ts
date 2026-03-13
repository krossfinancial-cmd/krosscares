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

type UserRow = {
  id: string;
  email: string;
  fullName: string | null;
};

type ClientRow = {
  id: string;
  userId: string;
  vertical: string;
  onboardingStatus: string;
};

type ZipInventoryRow = {
  id: string;
  zipCode: string;
  vertical: string;
  annualPriceCents: number;
  status: string;
  assignedClientId: string | null;
  reservationExpiresAt: string | null;
  updatedAt: string | null;
  createdAt: string;
};

type PaymentRow = {
  id: string;
  clientId: string;
  zipId: string;
  provider: string;
  providerSessionId: string | null;
  amountCents: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
};

type ContractRow = {
  id: string;
  clientId: string;
  zipId: string;
  status: string;
  documentUrl: string | null;
  sentAt: string | null;
  signedAt: string | null;
  createdAt: string;
};

type OnboardingFormRow = {
  id: string;
  clientId: string;
  zipId: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
};

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

function buildProviderSessionId(payment: InvoicePaymentWrite) {
  return firstNonNull(
    payment.stripe_payment_intent_id,
    payment.stripe_charge_id,
    payment.stripe_invoice_id,
  );
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

async function findUserByEmail(email: string) {
  const { data, error } = await supabase
    .from("User")
    .select("id,email,fullName")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up user by email: ${error.message}`);
  }

  return data as UserRow | null;
}

async function findClientByUserId(userId: string) {
  const { data, error } = await supabase
    .from("Client")
    .select("id,userId,vertical,onboardingStatus")
    .eq("userId", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up client by user id: ${error.message}`);
  }

  return data as ClientRow | null;
}

async function findPaymentsForClient(clientId: string) {
  const { data, error } = await supabase
    .from("Payment")
    .select("id,clientId,zipId,provider,providerSessionId,amountCents,status,paidAt,createdAt")
    .eq("clientId", clientId)
    .order("createdAt", { ascending: false });

  if (error) {
    throw new Error(`Failed to load payments for client: ${error.message}`);
  }

  return (data ?? []) as PaymentRow[];
}

async function findAssignedZipsForClient(clientId: string) {
  const { data, error } = await supabase
    .from("ZipInventory")
    .select("id,zipCode,vertical,annualPriceCents,status,assignedClientId,reservationExpiresAt,updatedAt,createdAt")
    .eq("assignedClientId", clientId)
    .in("status", ["RESERVED", "SOLD"])
    .order("updatedAt", { ascending: false, nullsFirst: false })
    .order("createdAt", { ascending: false });

  if (error) {
    throw new Error(`Failed to load assigned zips for client: ${error.message}`);
  }

  return (data ?? []) as ZipInventoryRow[];
}

async function findContract(clientId: string, zipId: string) {
  const { data, error } = await supabase
    .from("Contract")
    .select("id,clientId,zipId,status,documentUrl,sentAt,signedAt,createdAt")
    .eq("clientId", clientId)
    .eq("zipId", zipId)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load contract for client/zip: ${error.message}`);
  }

  return data as ContractRow | null;
}

async function findOnboardingForm(clientId: string, zipId: string) {
  const { data, error } = await supabase
    .from("OnboardingForm")
    .select("id,clientId,zipId,status,submittedAt,createdAt")
    .eq("clientId", clientId)
    .eq("zipId", zipId)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load onboarding form for client/zip: ${error.message}`);
  }

  return data as OnboardingFormRow | null;
}

function pickZipForPortalSync(payments: PaymentRow[], zips: ZipInventoryRow[], invoicePayment: InvoicePaymentWrite) {
  const sessionId = buildProviderSessionId(invoicePayment);
  const amountPaid = invoicePayment.amount_paid;

  if (sessionId) {
    const bySession = payments.find((payment) => payment.providerSessionId === sessionId);
    if (bySession) {
      return zips.find((zip) => zip.id === bySession.zipId) ?? null;
    }
  }

  if (amountPaid !== null) {
    const pendingByAmount = payments.find(
      (payment) => payment.status === "PENDING" && payment.amountCents === amountPaid,
    );
    if (pendingByAmount) {
      return zips.find((zip) => zip.id === pendingByAmount.zipId) ?? null;
    }

    const reservedByAmount = zips.filter(
      (zip) => zip.status === "RESERVED" && zip.annualPriceCents === amountPaid,
    );
    if (reservedByAmount.length === 1) {
      return reservedByAmount[0];
    }

    const assignedByAmount = zips.filter((zip) => zip.annualPriceCents === amountPaid);
    if (assignedByAmount.length === 1) {
      return assignedByAmount[0];
    }
  }

  const reservedZips = zips.filter((zip) => zip.status === "RESERVED");
  if (reservedZips.length === 1) {
    return reservedZips[0];
  }

  if (zips.length === 1) {
    return zips[0];
  }

  return null;
}

async function upsertPortalPayment(
  client: ClientRow,
  zip: ZipInventoryRow,
  invoicePayment: InvoicePaymentWrite,
  event: Stripe.Event,
) {
  const providerSessionId = buildProviderSessionId(invoicePayment);
  const current = new Date().toISOString();
  const payments = await findPaymentsForClient(client.id);

  const existingPaid = payments.find(
    (payment) => payment.zipId === zip.id && payment.status === "PAID",
  );

  if (existingPaid) {
    const { error } = await supabase
      .from("Payment")
      .update({
        provider: "stripe",
        providerSessionId: providerSessionId ?? existingPaid.providerSessionId,
        paidAt: existingPaid.paidAt ?? invoicePayment.paid_at ?? current,
      })
      .eq("id", existingPaid.id);

    if (error) {
      throw new Error(`Failed to update existing paid Payment row: ${error.message}`);
    }

    return existingPaid.id;
  }

  const pending = payments.find(
    (payment) => payment.zipId === zip.id && payment.status === "PENDING",
  );

  if (pending) {
    const { error } = await supabase
      .from("Payment")
      .update({
        status: "PAID",
        provider: "stripe",
        providerSessionId,
        paidAt: invoicePayment.paid_at ?? current,
      })
      .eq("id", pending.id);

    if (error) {
      throw new Error(`Failed to update pending Payment row: ${error.message}`);
    }

    return pending.id;
  }

  const { data, error } = await supabase
    .from("Payment")
    .insert({
      id: crypto.randomUUID(),
      clientId: client.id,
      zipId: zip.id,
      provider: "stripe",
      providerSessionId,
      amountCents: invoicePayment.amount_paid ?? zip.annualPriceCents,
      status: "PAID",
      paidAt: invoicePayment.paid_at ?? current,
      createdAt: current,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create Payment row from Stripe webhook: ${error.message}`);
  }

  log("info", "stripe_webhook.portal_payment_synced", {
    stripe_event_id: event.id,
    client_id: client.id,
    zip_id: zip.id,
    payment_id: data.id,
  });

  return data.id as string;
}

async function ensurePortalContract(client: ClientRow, zip: ZipInventoryRow, paidAt: string | null) {
  const current = new Date().toISOString();
  const existing = await findContract(client.id, zip.id);

  if (existing) {
    if (existing.status === "SIGNED") {
      return existing.id;
    }

    const { error } = await supabase
      .from("Contract")
      .update({
        status: "SENT",
        sentAt: existing.sentAt ?? paidAt ?? current,
        documentUrl: existing.documentUrl ?? "/terms-and-conditions.pdf",
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(`Failed to update Contract row from Stripe webhook: ${error.message}`);
    }

    return existing.id;
  }

  const { data, error } = await supabase
    .from("Contract")
    .insert({
      id: crypto.randomUUID(),
      clientId: client.id,
      zipId: zip.id,
      status: "SENT",
      documentUrl: "/terms-and-conditions.pdf",
      sentAt: paidAt ?? current,
      signedAt: null,
      createdAt: current,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create Contract row from Stripe webhook: ${error.message}`);
  }

  return data.id as string;
}

async function ensurePortalOnboardingForm(client: ClientRow, zip: ZipInventoryRow) {
  const current = new Date().toISOString();
  const existing = await findOnboardingForm(client.id, zip.id);

  if (existing) {
    if (existing.status === "COMPLETED") {
      return existing.id;
    }

    const { error } = await supabase
      .from("OnboardingForm")
      .update({
        status: "SENT",
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(`Failed to update OnboardingForm row from Stripe webhook: ${error.message}`);
    }

    return existing.id;
  }

  const { data, error } = await supabase
    .from("OnboardingForm")
    .insert({
      id: crypto.randomUUID(),
      clientId: client.id,
      zipId: zip.id,
      status: "SENT",
      submittedAt: null,
      createdAt: current,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create OnboardingForm row from Stripe webhook: ${error.message}`);
  }

  return data.id as string;
}

async function updatePortalZipReservation(zipId: string) {
  const { error } = await supabase
    .from("ZipInventory")
    .update({
      reservationExpiresAt: null,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", zipId);

  if (error) {
    throw new Error(`Failed to update ZipInventory reservation from Stripe webhook: ${error.message}`);
  }
}

async function syncPortalStateForPaidWebhook(invoicePayment: InvoicePaymentWrite, event: Stripe.Event) {
  if (invoicePayment.status !== "paid" || !invoicePayment.customer_email) {
    return;
  }

  const user = await findUserByEmail(invoicePayment.customer_email);
  if (!user) {
    log("info", "stripe_webhook.portal_sync_skipped", {
      stripe_event_id: event.id,
      reason: "user_not_found",
      customer_email: invoicePayment.customer_email,
    });
    return;
  }

  const client = await findClientByUserId(user.id);
  if (!client) {
    log("info", "stripe_webhook.portal_sync_skipped", {
      stripe_event_id: event.id,
      reason: "client_not_found",
      user_id: user.id,
      customer_email: invoicePayment.customer_email,
    });
    return;
  }

  const [payments, assignedZips] = await Promise.all([
    findPaymentsForClient(client.id),
    findAssignedZipsForClient(client.id),
  ]);

  const zip = pickZipForPortalSync(payments, assignedZips, invoicePayment);
  if (!zip) {
    log("info", "stripe_webhook.portal_sync_skipped", {
      stripe_event_id: event.id,
      reason: "zip_match_not_found_or_ambiguous",
      client_id: client.id,
      customer_email: invoicePayment.customer_email,
      amount_paid: invoicePayment.amount_paid,
      assigned_zip_count: assignedZips.length,
    });
    return;
  }

  const [paymentId, contractId, onboardingFormId] = await Promise.all([
    upsertPortalPayment(client, zip, invoicePayment, event),
    ensurePortalContract(client, zip, invoicePayment.paid_at),
    ensurePortalOnboardingForm(client, zip),
  ]);

  await updatePortalZipReservation(zip.id);

  log("info", "stripe_webhook.portal_sync_success", {
    stripe_event_id: event.id,
    client_id: client.id,
    user_id: user.id,
    zip_id: zip.id,
    payment_id: paymentId,
    contract_id: contractId,
    onboarding_form_id: onboardingFormId,
  });
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
    await syncPortalStateForPaidWebhook(invoicePayment, event);

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
