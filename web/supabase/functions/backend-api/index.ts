import { createClient } from "npm:@supabase/supabase-js@2.50.0";
import bcrypt from "npm:bcryptjs@3.0.3";

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SHARED_SECRET = Deno.env.get("BACKEND_API_SHARED_SECRET") || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const JSON_HEADERS = {
  "content-type": "application/json",
};

function nowIso() {
  return new Date().toISOString();
}

function addDays(value: Date | string, days: number) {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function addHours(value: Date | string, hours: number) {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  date.setHours(date.getHours() + hours);
  return date;
}

function daysBetweenCalendar(a: Date, b: Date) {
  const aMidnight = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bMidnight = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((aMidnight - bMidnight) / (24 * 60 * 60 * 1000));
}

function ensure(value: unknown, message: string): asserts value {
  if (!value) {
    throw new ApiError(400, message);
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeEmail(value: unknown) {
  return asString(value).toLowerCase().trim();
}

function randomToken() {
  return `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
}

function randomHex(bytes = 32) {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buffer)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function audit(actorUserId: string | null, action: string, entityType: string, entityId: string, metadata?: unknown) {
  const { error } = await supabase.from("AuditLog").insert({
    id: crypto.randomUUID(),
    actorUserId,
    action,
    entityType,
    entityId,
    metadata: metadata ?? null,
    createdAt: nowIso(),
  });
  if (error) {
    throw new ApiError(500, `Failed to write audit log: ${error.message}`);
  }
}

async function fetchZipById(zipId: string) {
  const { data, error } = await supabase.from("ZipInventory").select("*").eq("id", zipId).maybeSingle();
  if (error) throw new ApiError(500, error.message);
  return data;
}

async function fetchClientById(clientId: string) {
  const { data, error } = await supabase.from("Client").select("*").eq("id", clientId).maybeSingle();
  if (error) throw new ApiError(500, error.message);
  return data;
}

async function fetchUserById(userId: string) {
  const { data, error } = await supabase.from("User").select("*").eq("id", userId).maybeSingle();
  if (error) throw new ApiError(500, error.message);
  return data;
}

async function fetchClientByUserId(userId: string) {
  const { data, error } = await supabase.from("Client").select("*").eq("userId", userId).maybeSingle();
  if (error) throw new ApiError(500, error.message);
  return data;
}

async function upsertOnboardingForm(clientId: string, zipId: string, status: string, submittedAt: string | null) {
  const { data: existing, error: existingError } = await supabase
    .from("OnboardingForm")
    .select("id")
    .eq("clientId", clientId)
    .eq("zipId", zipId)
    .maybeSingle();
  if (existingError) throw new ApiError(500, existingError.message);

  if (existing) {
    const { error } = await supabase
      .from("OnboardingForm")
      .update({ status, submittedAt })
      .eq("id", existing.id);
    if (error) throw new ApiError(500, error.message);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("OnboardingForm")
    .insert({
      id: crypto.randomUUID(),
      clientId,
      zipId,
      status,
      submittedAt,
      createdAt: nowIso(),
    })
    .select("id")
    .single();

  if (error) throw new ApiError(500, error.message);
  return data.id as string;
}

async function upsertLeadRoute(params: {
  clientId: string;
  zipCode: string;
  vertical: string;
  destinationEmail: string;
  destinationPhone: string;
  active: boolean;
}) {
  const { data: existing, error: existingError } = await supabase
    .from("LeadRoute")
    .select("id")
    .eq("zipCode", params.zipCode)
    .eq("vertical", params.vertical)
    .maybeSingle();

  if (existingError) throw new ApiError(500, existingError.message);

  if (existing) {
    const { error } = await supabase
      .from("LeadRoute")
      .update({
        clientId: params.clientId,
        vertical: params.vertical,
        destinationEmail: params.destinationEmail,
        destinationPhone: params.destinationPhone,
        active: params.active,
        updatedAt: nowIso(),
      })
      .eq("id", existing.id);
    if (error) throw new ApiError(500, error.message);
    return;
  }

  const current = nowIso();
  const { error } = await supabase.from("LeadRoute").insert({
    id: crypto.randomUUID(),
    clientId: params.clientId,
    zipCode: params.zipCode,
    vertical: params.vertical,
    destinationEmail: params.destinationEmail,
    destinationPhone: params.destinationPhone,
    alertsEmail: true,
    alertsSms: true,
    active: params.active,
    createdAt: current,
    updatedAt: current,
  });
  if (error) throw new ApiError(500, error.message);
}

async function issuePasswordSetupToken(userId: string, expiresInHours = 72) {
  const rawToken = randomHex(32);
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = addHours(new Date(), expiresInHours);

  const { error } = await supabase.from("PasswordSetupToken").insert({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
    usedAt: null,
    createdAt: nowIso(),
  });

  if (error) throw new ApiError(500, error.message);

  return {
    token: rawToken,
    expiresAt: expiresAt.toISOString(),
  };
}

async function attemptActivation(zipId: string, userId: string, clientId: string) {
  const client = await fetchClientById(clientId);
  if (!client) throw new ApiError(404, "Client profile not found.");

  const zip = await fetchZipById(zipId);
  if (!zip) throw new ApiError(404, "ZIP not found.");
  if (zip.assignedClientId !== clientId) throw new ApiError(400, "ZIP assignment mismatch.");

  const [{ count: paidCount, error: paidError }, { count: signedCount, error: signedError }, { count: onboardedCount, error: onboardedError }] =
    await Promise.all([
      supabase
        .from("Payment")
        .select("id", { count: "exact", head: true })
        .eq("clientId", clientId)
        .eq("zipId", zipId)
        .eq("status", "PAID"),
      supabase
        .from("Contract")
        .select("id", { count: "exact", head: true })
        .eq("clientId", clientId)
        .eq("zipId", zipId)
        .eq("status", "SIGNED"),
      supabase
        .from("OnboardingForm")
        .select("id", { count: "exact", head: true })
        .eq("clientId", clientId)
        .eq("zipId", zipId)
        .eq("status", "COMPLETED"),
    ]);

  if (paidError) throw new ApiError(500, paidError.message);
  if (signedError) throw new ApiError(500, signedError.message);
  if (onboardedError) throw new ApiError(500, onboardedError.message);

  const hasPaid = (paidCount ?? 0) > 0;
  const hasSigned = (signedCount ?? 0) > 0;
  const hasOnboarded = (onboardedCount ?? 0) > 0;

  if (!hasPaid || !hasSigned || !hasOnboarded) {
    return { activated: false };
  }

  const current = nowIso();
  const renewalDate = addDays(new Date(), 365).toISOString();

  const { error: zipError } = await supabase
    .from("ZipInventory")
    .update({
      status: "SOLD",
      renewalDate,
      reservationExpiresAt: null,
      updatedAt: current,
    })
    .eq("id", zipId);
  if (zipError) throw new ApiError(500, zipError.message);

  const { error: clientError } = await supabase
    .from("Client")
    .update({
      onboardingStatus: "ACTIVE",
      updatedAt: current,
    })
    .eq("id", clientId);
  if (clientError) throw new ApiError(500, clientError.message);

  await upsertLeadRoute({
    clientId,
    zipCode: zip.zipCode,
    vertical: zip.vertical,
    destinationEmail: client.leadRoutingEmail ?? "",
    destinationPhone: client.leadRoutingPhone ?? "",
    active: true,
  });

  await audit(userId, "zip.activated", "zip_inventory", zipId, { zipCode: zip.zipCode });

  return { activated: true };
}

async function reserveZipAction(payload: Record<string, unknown>) {
  const zipId = asString(payload.zipId);
  const userId = asString(payload.userId);
  let clientId = asString(payload.clientId);
  const expectedVertical = asString(payload.expectedVertical) || null;

  ensure(zipId, "ZIP id is required.");
  ensure(userId, "User id is required.");
  if (!clientId) {
    const client = await fetchClientByUserId(userId);
    if (!client) throw new ApiError(400, "Client profile missing.");
    clientId = client.id as string;
    if (expectedVertical && client.vertical !== expectedVertical) {
      throw new ApiError(400, "Client vertical profile mismatch.");
    }
  }

  const zip = await fetchZipById(zipId);
  if (!zip) throw new ApiError(404, "ZIP not found.");

  if (expectedVertical && zip.vertical !== expectedVertical) {
    throw new ApiError(400, "ZIP vertical mismatch.");
  }

  const now = new Date();
  const canReserve =
    zip.status === "AVAILABLE" ||
    (zip.status === "RESERVED" && zip.reservationExpiresAt && new Date(zip.reservationExpiresAt) < now) ||
    (zip.status === "RESERVED" && zip.assignedClientId === clientId);

  if (!canReserve) {
    throw new ApiError(400, "ZIP is currently unavailable.");
  }

  const { error: updateError } = await supabase
    .from("ZipInventory")
    .update({
      status: "RESERVED",
      assignedClientId: clientId,
      reservationExpiresAt: null,
      updatedAt: nowIso(),
    })
    .eq("id", zipId);
  if (updateError) throw new ApiError(500, updateError.message);

  await audit(userId, "zip.reserved", "zip_inventory", zipId, {
    zipCode: zip.zipCode,
    contactWindowHours: 24,
  });

  return {
    ok: true,
    reservationExpiresAt: null,
  };
}

async function completeMockPaymentAction(payload: Record<string, unknown>) {
  const zipId = asString(payload.zipId);
  const userId = asString(payload.userId);
  let clientId = asString(payload.clientId);

  ensure(zipId, "ZIP id is required.");
  ensure(userId, "User id is required.");
  if (!clientId) {
    const client = await fetchClientByUserId(userId);
    if (!client) throw new ApiError(400, "Client profile missing.");
    clientId = client.id as string;
  }

  const zip = await fetchZipById(zipId);
  if (!zip) throw new ApiError(404, "ZIP not found.");
  if (zip.assignedClientId !== clientId) throw new ApiError(400, "ZIP is not assigned to this account.");
  if (zip.status !== "RESERVED") throw new ApiError(400, "ZIP must be reserved before payment.");

  if (zip.reservationExpiresAt && new Date(zip.reservationExpiresAt) <= new Date()) {
    const { error: releaseError } = await supabase
      .from("ZipInventory")
      .update({
        status: "AVAILABLE",
        assignedClientId: null,
        reservationExpiresAt: null,
        updatedAt: nowIso(),
      })
      .eq("id", zipId);

    if (releaseError) throw new ApiError(500, releaseError.message);
    throw new ApiError(400, "Reservation expired. Reclaim this ZIP to continue checkout.");
  }

  const current = nowIso();

  const { error: paymentError } = await supabase
    .from("Payment")
    .update({
      status: "PAID",
      paidAt: current,
    })
    .eq("clientId", clientId)
    .eq("zipId", zipId)
    .eq("status", "PENDING");
  if (paymentError) throw new ApiError(500, paymentError.message);

  const { error: contractError } = await supabase
    .from("Contract")
    .update({
      status: "SENT",
      sentAt: current,
    })
    .eq("clientId", clientId)
    .eq("zipId", zipId);
  if (contractError) throw new ApiError(500, contractError.message);

  const { error: onboardingError } = await supabase
    .from("OnboardingForm")
    .update({
      status: "SENT",
    })
    .eq("clientId", clientId)
    .eq("zipId", zipId);
  if (onboardingError) throw new ApiError(500, onboardingError.message);

  const { error: zipError } = await supabase
    .from("ZipInventory")
    .update({ reservationExpiresAt: null, updatedAt: current })
    .eq("id", zipId);
  if (zipError) throw new ApiError(500, zipError.message);

  await audit(userId || null, "payment.completed", "zip_inventory", zipId, {
    provider: "mock",
  });

  return { ok: true };
}

async function signContractAction(payload: Record<string, unknown>) {
  const zipId = asString(payload.zipId);
  const userId = asString(payload.userId);
  let clientId = asString(payload.clientId);

  ensure(zipId, "ZIP id is required.");
  ensure(userId, "User id is required.");
  if (!clientId) {
    const client = await fetchClientByUserId(userId);
    if (!client) throw new ApiError(400, "Client profile missing.");
    clientId = client.id as string;
  }

  const { error } = await supabase
    .from("Contract")
    .update({
      status: "SIGNED",
      signedAt: nowIso(),
      documentUrl: "https://example.local/contracts/territory-agreement.pdf",
    })
    .eq("clientId", clientId)
    .eq("zipId", zipId)
    .eq("status", "SENT");

  if (error) throw new ApiError(500, error.message);

  await audit(userId || null, "contract.signed", "zip_inventory", zipId);

  return { ok: true };
}

async function finalizeOnboardingAction(payload: Record<string, unknown>) {
  const zipId = asString(payload.zipId);
  const userId = asString(payload.userId);
  let clientId = asString(payload.clientId);
  const fullName = asString(payload.fullName).trim();
  const companyName = asString(payload.companyName).trim();
  const licenseNumber = asString(payload.licenseNumber).trim();
  const website = asString(payload.website).trim();
  const leadRoutingEmail = normalizeEmail(payload.leadRoutingEmail);
  const leadRoutingPhone = asString(payload.leadRoutingPhone).trim();
  const headshotUrl = asString(payload.headshotUrl).trim();
  const logoUrl = asString(payload.logoUrl).trim();

  ensure(zipId, "ZIP id is required.");
  ensure(userId, "User id is required.");
  if (!clientId) {
    const client = await fetchClientByUserId(userId);
    if (!client) throw new ApiError(400, "Client profile missing.");
    clientId = client.id as string;
  }
  ensure(fullName, "Full name is required.");
  ensure(companyName, "Company name is required.");
  ensure(leadRoutingEmail, "Lead routing email is required.");
  ensure(leadRoutingPhone, "Lead routing phone is required.");

  const zip = await fetchZipById(zipId);
  if (!zip || zip.assignedClientId !== clientId) {
    throw new ApiError(400, "ZIP is not assigned to this client.");
  }

  const current = nowIso();

  const { error: userError } = await supabase
    .from("User")
    .update({
      fullName,
      companyName,
      updatedAt: current,
    })
    .eq("id", userId);
  if (userError) throw new ApiError(500, userError.message);

  const { error: clientError } = await supabase
    .from("Client")
    .update({
      licenseNumber: licenseNumber || null,
      website: website || null,
      headshotUrl: headshotUrl || null,
      logoUrl: logoUrl || null,
      leadRoutingEmail,
      leadRoutingPhone,
      onboardingStatus: "FORM_COMPLETE",
      updatedAt: current,
    })
    .eq("id", clientId);
  if (clientError) throw new ApiError(500, clientError.message);

  await upsertOnboardingForm(clientId, zipId, "COMPLETED", current);

  await audit(userId, "onboarding.completed", "zip_inventory", zipId);

  const activation = await attemptActivation(zipId, userId, clientId);
  return {
    ok: true,
    activated: activation.activated,
  };
}

async function updateRoutesAction(payload: Record<string, unknown>) {
  const userId = asString(payload.userId);
  let clientId = asString(payload.clientId);
  const leadRoutingEmail = normalizeEmail(payload.leadRoutingEmail);
  const leadRoutingPhone = asString(payload.leadRoutingPhone).trim();

  ensure(userId, "User id is required.");
  ensure(leadRoutingEmail, "Lead routing email is required.");
  ensure(leadRoutingPhone, "Lead routing phone is required.");
  if (!clientId) {
    const clientByUser = await fetchClientByUserId(userId);
    if (!clientByUser) throw new ApiError(403, "forbidden");
    clientId = clientByUser.id as string;
  }

  const client = await fetchClientById(clientId);
  if (!client || client.userId !== userId) {
    throw new ApiError(403, "forbidden");
  }

  const current = nowIso();

  const { error: clientError } = await supabase
    .from("Client")
    .update({
      leadRoutingEmail,
      leadRoutingPhone,
      updatedAt: current,
    })
    .eq("id", clientId);
  if (clientError) throw new ApiError(500, clientError.message);

  const { error: routeError } = await supabase
    .from("LeadRoute")
    .update({
      destinationEmail: leadRoutingEmail,
      destinationPhone: leadRoutingPhone,
      updatedAt: current,
    })
    .eq("clientId", clientId);

  if (routeError) throw new ApiError(500, routeError.message);

  return { ok: true };
}

async function waitlistJoinAction(payload: Record<string, unknown>) {
  const zipCode = asString(payload.zipCode).trim();
  const vertical = asString(payload.vertical).toUpperCase();
  const name = asString(payload.name).trim();
  const email = normalizeEmail(payload.email);
  const phone = asString(payload.phone).trim();
  const businessType = asString(payload.businessType).trim();

  ensure(zipCode, "ZIP code is required.");
  ensure(vertical === "REALTOR" || vertical === "DEALER", "Invalid vertical.");

  const { data: zip, error: zipError } = await supabase
    .from("ZipInventory")
    .select("id")
    .eq("zipCode", zipCode)
    .eq("vertical", vertical)
    .maybeSingle();

  if (zipError) throw new ApiError(500, zipError.message);
  if (!zip) throw new ApiError(404, "zip-not-found");

  const { error } = await supabase.from("Waitlist").insert({
    id: crypto.randomUUID(),
    zipId: zip.id,
    zipCode,
    vertical,
    name,
    email,
    phone,
    businessType,
    status: "PENDING",
    createdAt: nowIso(),
  });

  if (error) throw new ApiError(500, error.message);

  return { ok: true };
}

async function createClientAction(payload: Record<string, unknown>) {
  const actorUserId = asString(payload.actorUserId);
  const fullName = asString(payload.fullName).trim();
  const email = normalizeEmail(payload.email);
  const password = asString(payload.password);
  const companyName = asString(payload.companyName).trim();
  const phone = asString(payload.phone).trim();
  const vertical = asString(payload.vertical).toUpperCase() === "DEALER" ? "DEALER" : "REALTOR";

  ensure(actorUserId, "actorUserId is required.");
  ensure(fullName, "fullName is required.");
  ensure(email, "email is required.");
  ensure(password.length >= 8, "password-too-short");

  const { data: existingUser, error: existingError } = await supabase
    .from("User")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingError) throw new ApiError(500, existingError.message);
  if (existingUser) throw new ApiError(409, "email-already-exists");

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const role = vertical === "DEALER" ? "DEALER" : "REALTOR";
  const current = nowIso();

  const { error: userError } = await supabase.from("User").insert({
    id: userId,
    email,
    passwordHash,
    role,
    fullName,
    phone: phone || null,
    companyName: companyName || null,
    createdAt: current,
    updatedAt: current,
  });
  if (userError) throw new ApiError(500, userError.message);

  const { error: clientError } = await supabase.from("Client").insert({
    id: clientId,
    userId,
    vertical,
    serviceState: "NC",
    leadRoutingEmail: email,
    leadRoutingPhone: phone || "",
    preferredContactMethod: "EMAIL",
    onboardingStatus: "PENDING",
    createdAt: current,
    updatedAt: current,
  });
  if (clientError) throw new ApiError(500, clientError.message);

  await audit(actorUserId, "client.created_admin", "client", clientId, {
    email,
    vertical,
  });

  return { ok: true, userId, clientId };
}

async function assignZipInternal(args: {
  zipId: string;
  clientId: string;
  actorUserId: string;
  strictAssign: boolean;
  action: "zip.assigned_admin" | "zip.reassigned_admin";
  provider: "admin_manual" | "admin_reassign";
}) {
  const zip = await fetchZipById(args.zipId);
  if (!zip) throw new ApiError(404, "ZIP not found.");
  if (zip.status === "BLOCKED") throw new ApiError(400, "ZIP is blocked.");

  if (args.strictAssign) {
    if (zip.status === "SOLD" && zip.assignedClientId && zip.assignedClientId !== args.clientId) {
      throw new ApiError(400, "ZIP is already sold.");
    }
    if (zip.status === "RESERVED" && zip.assignedClientId && zip.assignedClientId !== args.clientId) {
      throw new ApiError(400, "ZIP is currently reserved by another client.");
    }
  }

  const client = await fetchClientById(args.clientId);
  if (!client) throw new ApiError(404, "Client not found.");
  if (client.vertical !== zip.vertical) throw new ApiError(400, "Client vertical must match ZIP vertical.");

  const user = await fetchUserById(client.userId);
  if (!user) throw new ApiError(404, "Client user not found.");

  const current = nowIso();
  const renewalDate = addDays(new Date(), 365).toISOString();

  const { error: zipUpdateError } = await supabase
    .from("ZipInventory")
    .update({
      status: "SOLD",
      assignedClientId: args.clientId,
      reservationExpiresAt: null,
      renewalDate,
      updatedAt: current,
    })
    .eq("id", args.zipId);

  if (zipUpdateError) throw new ApiError(500, zipUpdateError.message);

  const { data: paidPayment, error: paidPaymentError } = await supabase
    .from("Payment")
    .select("id")
    .eq("clientId", args.clientId)
    .eq("zipId", args.zipId)
    .eq("status", "PAID")
    .limit(1)
    .maybeSingle();

  if (paidPaymentError) throw new ApiError(500, paidPaymentError.message);

  if (!paidPayment) {
    const { data: pendingPayment, error: pendingPaymentError } = await supabase
      .from("Payment")
      .select("id")
      .eq("clientId", args.clientId)
      .eq("zipId", args.zipId)
      .eq("status", "PENDING")
      .limit(1)
      .maybeSingle();

    if (pendingPaymentError) throw new ApiError(500, pendingPaymentError.message);

    if (pendingPayment) {
      const { error } = await supabase
        .from("Payment")
        .update({
          status: "PAID",
          paidAt: current,
          provider: args.provider,
        })
        .eq("id", pendingPayment.id);
      if (error) throw new ApiError(500, error.message);
    } else {
      const { error } = await supabase.from("Payment").insert({
        id: crypto.randomUUID(),
        clientId: args.clientId,
        zipId: args.zipId,
        provider: args.provider,
        providerSessionId: null,
        amountCents: zip.annualPriceCents,
        status: "PAID",
        paidAt: current,
        createdAt: current,
      });
      if (error) throw new ApiError(500, error.message);
    }
  }

  const { data: signedContract, error: signedContractError } = await supabase
    .from("Contract")
    .select("id")
    .eq("clientId", args.clientId)
    .eq("zipId", args.zipId)
    .eq("status", "SIGNED")
    .limit(1)
    .maybeSingle();
  if (signedContractError) throw new ApiError(500, signedContractError.message);

  if (!signedContract) {
    const { data: existingContract, error: existingContractError } = await supabase
      .from("Contract")
      .select("id,sentAt,documentUrl")
      .eq("clientId", args.clientId)
      .eq("zipId", args.zipId)
      .limit(1)
      .maybeSingle();

    if (existingContractError) throw new ApiError(500, existingContractError.message);

    if (existingContract) {
      const { error } = await supabase
        .from("Contract")
        .update({
          status: "SIGNED",
          sentAt: existingContract.sentAt || current,
          signedAt: current,
          documentUrl:
            existingContract.documentUrl ||
            (args.action === "zip.reassigned_admin"
              ? "https://example.local/contracts/admin-reassigned.pdf"
              : "https://example.local/contracts/admin-assigned.pdf"),
        })
        .eq("id", existingContract.id);
      if (error) throw new ApiError(500, error.message);
    } else {
      const { error } = await supabase.from("Contract").insert({
        id: crypto.randomUUID(),
        clientId: args.clientId,
        zipId: args.zipId,
        status: "SIGNED",
        sentAt: current,
        signedAt: current,
        documentUrl:
          args.action === "zip.reassigned_admin"
            ? "https://example.local/contracts/admin-reassigned.pdf"
            : "https://example.local/contracts/admin-assigned.pdf",
        createdAt: current,
      });
      if (error) throw new ApiError(500, error.message);
    }
  }

  await upsertOnboardingForm(args.clientId, args.zipId, "COMPLETED", current);

  const routingEmail = client.leadRoutingEmail || user.email;
  const routingPhone = client.leadRoutingPhone || user.phone || "";

  const { error: clientUpdateError } = await supabase
    .from("Client")
    .update({
      onboardingStatus: "ACTIVE",
      leadRoutingEmail: routingEmail,
      leadRoutingPhone: routingPhone,
      preferredContactMethod: client.preferredContactMethod || "EMAIL",
      updatedAt: current,
    })
    .eq("id", args.clientId);

  if (clientUpdateError) throw new ApiError(500, clientUpdateError.message);

  await upsertLeadRoute({
    clientId: args.clientId,
    zipCode: zip.zipCode,
    vertical: zip.vertical,
    destinationEmail: routingEmail,
    destinationPhone: routingPhone,
    active: true,
  });

  await audit(args.actorUserId, args.action, "zip_inventory", args.zipId, {
    zipCode: zip.zipCode,
    clientId: args.clientId,
    fromClientId: zip.assignedClientId || null,
    toClientId: args.clientId,
    noOpSameClient: zip.assignedClientId === args.clientId,
  });

  return { ok: true };
}

async function releaseZipAction(payload: Record<string, unknown>) {
  const zipId = asString(payload.zipId);
  const actorUserId = asString(payload.actorUserId) || null;
  ensure(zipId, "zipId is required.");

  const zip = await fetchZipById(zipId);
  if (!zip) throw new ApiError(404, "ZIP not found.");

  const current = nowIso();

  const { error: zipError } = await supabase
    .from("ZipInventory")
    .update({
      status: "AVAILABLE",
      assignedClientId: null,
      reservationExpiresAt: null,
      renewalDate: null,
      updatedAt: current,
    })
    .eq("id", zipId);
  if (zipError) throw new ApiError(500, zipError.message);

  const { error: routeError } = await supabase
    .from("LeadRoute")
    .update({
      active: false,
      updatedAt: current,
    })
    .eq("zipCode", zip.zipCode)
    .eq("vertical", zip.vertical);
  if (routeError) throw new ApiError(500, routeError.message);

  await audit(actorUserId, "zip.released", "zip_inventory", zipId, {
    zipCode: zip.zipCode,
  });

  return { ok: true };
}

async function enrollAction(payload: Record<string, unknown>) {
  const actorUserId = asString(payload.actorUserId);
  const zipId = asString(payload.zipId);
  const fullName = asString(payload.fullName).trim();
  const companyName = asString(payload.companyName).trim();
  const email = normalizeEmail(payload.email);
  const phone = asString(payload.phone).trim();
  const licenseNumber = asString(payload.licenseNumber).trim();
  const website = asString(payload.website).trim();
  const leadRoutingEmail = normalizeEmail(payload.leadRoutingEmail);
  const leadRoutingPhone = asString(payload.leadRoutingPhone).trim();
  const headshotUrl = asString(payload.headshotUrl).trim();
  const logoUrl = asString(payload.logoUrl).trim();

  ensure(actorUserId, "actorUserId is required.");
  ensure(zipId, "zipId is required.");
  ensure(fullName, "fullName is required.");
  ensure(companyName, "companyName is required.");
  ensure(email, "email is required.");
  ensure(phone, "phone is required.");
  ensure(leadRoutingEmail, "leadRoutingEmail is required.");
  ensure(leadRoutingPhone, "leadRoutingPhone is required.");

  const zip = await fetchZipById(zipId);
  if (!zip) throw new ApiError(404, "zip-not-found");

  const { data: existingUser, error: existingUserError } = await supabase
    .from("User")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingUserError) throw new ApiError(500, existingUserError.message);
  if (existingUser) throw new ApiError(409, "Email already exists.");

  const role = zip.vertical === "DEALER" ? "DEALER" : "REALTOR";
  const passwordHash = await bcrypt.hash(randomHex(24), 12);
  const current = nowIso();

  const userId = crypto.randomUUID();
  const clientId = crypto.randomUUID();

  const { error: userError } = await supabase.from("User").insert({
    id: userId,
    email,
    passwordHash,
    role,
    fullName,
    phone,
    companyName,
    createdAt: current,
    updatedAt: current,
  });
  if (userError) throw new ApiError(500, userError.message);

  const { error: clientError } = await supabase.from("Client").insert({
    id: clientId,
    userId,
    vertical: zip.vertical,
    licenseNumber: licenseNumber || null,
    website: website || null,
    headshotUrl: headshotUrl || null,
    logoUrl: logoUrl || null,
    leadRoutingEmail,
    leadRoutingPhone,
    preferredContactMethod: "EMAIL",
    onboardingStatus: "FORM_COMPLETE",
    serviceState: zip.state,
    serviceCity: zip.city,
    createdAt: current,
    updatedAt: current,
  });
  if (clientError) throw new ApiError(500, clientError.message);

  await audit(actorUserId, "client.enrolled_admin", "client", clientId, {
    zipId,
    zipCode: zip.zipCode,
    vertical: zip.vertical,
  });

  if (zip.status === "SOLD" || (zip.status === "RESERVED" && zip.assignedClientId)) {
    await assignZipInternal({
      zipId,
      clientId,
      actorUserId,
      strictAssign: false,
      action: "zip.reassigned_admin",
      provider: "admin_reassign",
    });
  } else {
    await assignZipInternal({
      zipId,
      clientId,
      actorUserId,
      strictAssign: true,
      action: "zip.assigned_admin",
      provider: "admin_manual",
    });
  }

  const setup = await issuePasswordSetupToken(userId);

  return {
    ok: true,
    invite: {
      email,
      fullName,
      token: setup.token,
      expiresAt: setup.expiresAt,
    },
    zip: {
      zipCode: zip.zipCode,
      vertical: zip.vertical,
    },
  };
}

async function runRenewalsAction(payload: Record<string, unknown>) {
  const actorUserId = asString(payload.actorUserId) || null;
  const now = new Date();

  const { data: soldZips, error: soldZipsError } = await supabase
    .from("ZipInventory")
    .select("id,zipCode,vertical,status,renewalDate")
    .eq("status", "SOLD")
    .not("renewalDate", "is", null);

  if (soldZipsError) throw new ApiError(500, soldZipsError.message);

  let released = 0;
  let reminderCreated = 0;

  for (const zip of soldZips || []) {
    if (!zip.renewalDate) continue;
    const renewalDate = new Date(zip.renewalDate);
    const daysLeft = daysBetweenCalendar(renewalDate, now);

    if ([60, 30, 7].includes(daysLeft)) {
      const { data: existingReminder, error: existingReminderError } = await supabase
        .from("RenewalReminder")
        .select("id")
        .eq("zipId", zip.id)
        .eq("daysBefore", daysLeft)
        .maybeSingle();

      if (existingReminderError) throw new ApiError(500, existingReminderError.message);
      if (!existingReminder) {
        const { error } = await supabase.from("RenewalReminder").insert({
          id: crypto.randomUUID(),
          zipId: zip.id,
          daysBefore: daysLeft,
          sentAt: nowIso(),
        });
        if (error) throw new ApiError(500, error.message);
        reminderCreated += 1;
      }
    }

    if (daysLeft < -7) {
      const current = nowIso();
      const { error: routeError } = await supabase
        .from("LeadRoute")
        .update({ active: false, updatedAt: current })
        .eq("zipCode", zip.zipCode)
        .eq("vertical", zip.vertical);

      if (routeError) throw new ApiError(500, routeError.message);

      const { error: zipError } = await supabase
        .from("ZipInventory")
        .update({
          status: "AVAILABLE",
          assignedClientId: null,
          reservationExpiresAt: null,
          renewalDate: null,
          updatedAt: current,
        })
        .eq("id", zip.id);
      if (zipError) throw new ApiError(500, zipError.message);

      const { data: waitlistEntries, error: waitlistError } = await supabase
        .from("Waitlist")
        .select("id")
        .eq("zipId", zip.id)
        .eq("status", "PENDING");
      if (waitlistError) throw new ApiError(500, waitlistError.message);

      if (waitlistEntries?.length) {
        const ids = waitlistEntries.map((entry) => entry.id);
        const { error: waitlistUpdateError } = await supabase
          .from("Waitlist")
          .update({ status: "NOTIFIED" })
          .in("id", ids);
        if (waitlistUpdateError) throw new ApiError(500, waitlistUpdateError.message);
      }

      await audit(actorUserId, "zip.auto_released", "zip_inventory", zip.id, {
        zipCode: zip.zipCode,
        reason: "renewal_expired",
      });
      released += 1;
    }
  }

  return {
    ok: true,
    checked: soldZips?.length || 0,
    released,
    reminderCreated,
  };
}

async function authLoginAction(payload: Record<string, unknown>) {
  const email = normalizeEmail(payload.email);
  const password = asString(payload.password);

  ensure(email, "Invalid credentials.");
  ensure(password, "Invalid credentials.");

  const { data: user, error } = await supabase.from("User").select("*").eq("email", email).maybeSingle();
  if (error) throw new ApiError(500, error.message);
  if (!user) throw new ApiError(401, "Invalid credentials.");

  const isValid = await bcrypt.compare(password, user.passwordHash as string);
  if (!isValid) throw new ApiError(401, "Invalid credentials.");

  const token = randomToken();
  const expiresAt = addDays(new Date(), 30).toISOString();

  const { error: sessionError } = await supabase.from("Session").insert({
    id: crypto.randomUUID(),
    token,
    userId: user.id,
    expiresAt,
    createdAt: nowIso(),
  });

  if (sessionError) throw new ApiError(500, sessionError.message);

  return {
    ok: true,
    role: user.role,
    userId: user.id,
    session: {
      token,
      expiresAt,
    },
  };
}

async function authLogoutAction(payload: Record<string, unknown>) {
  const token = asString(payload.token);
  if (!token) return { ok: true };

  const { error } = await supabase.from("Session").delete().eq("token", token);
  if (error) throw new ApiError(500, error.message);
  return { ok: true };
}

async function authSetPasswordAction(payload: Record<string, unknown>) {
  const token = asString(payload.token).trim();
  const password = asString(payload.password);
  ensure(token, "invalid-token");
  ensure(password.length >= 8, "password-too-short");

  const tokenHash = await sha256Hex(token);
  const now = nowIso();

  const { data: tokenRecord, error: tokenError } = await supabase
    .from("PasswordSetupToken")
    .select("id,userId")
    .eq("tokenHash", tokenHash)
    .is("usedAt", null)
    .gt("expiresAt", now)
    .maybeSingle();

  if (tokenError) throw new ApiError(500, tokenError.message);
  if (!tokenRecord) throw new ApiError(400, "invalid-token");

  const passwordHash = await bcrypt.hash(password, 12);

  const { error: userUpdateError } = await supabase
    .from("User")
    .update({
      passwordHash,
      updatedAt: nowIso(),
    })
    .eq("id", tokenRecord.userId);

  if (userUpdateError) throw new ApiError(500, userUpdateError.message);

  const { error: tokenUpdateError } = await supabase
    .from("PasswordSetupToken")
    .update({
      usedAt: nowIso(),
    })
    .eq("userId", tokenRecord.userId)
    .is("usedAt", null);

  if (tokenUpdateError) throw new ApiError(500, tokenUpdateError.message);

  return { ok: true };
}

async function authSignupAction(payload: Record<string, unknown>) {
  const fullName = asString(payload.fullName).trim();
  const email = normalizeEmail(payload.email);
  const phone = asString(payload.phone).trim();
  const companyName = asString(payload.companyName).trim();
  const vertical = asString(payload.vertical).toUpperCase() === "DEALER" ? "DEALER" : "REALTOR";
  const password = asString(payload.password);

  ensure(fullName, "Invalid form input.");
  ensure(email, "Invalid form input.");
  ensure(phone, "Invalid form input.");
  ensure(password.length >= 8, "Invalid form input.");

  const { data: existing, error: existingError } = await supabase
    .from("User")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingError) throw new ApiError(500, existingError.message);
  if (existing) throw new ApiError(409, "email already exists");

  const passwordHash = await bcrypt.hash(password, 12);
  const role = vertical === "DEALER" ? "DEALER" : "REALTOR";
  const userId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const current = nowIso();

  const { error: userError } = await supabase.from("User").insert({
    id: userId,
    fullName,
    email,
    phone,
    companyName: companyName || null,
    passwordHash,
    role,
    createdAt: current,
    updatedAt: current,
  });
  if (userError) throw new ApiError(500, userError.message);

  const { error: clientError } = await supabase.from("Client").insert({
    id: clientId,
    userId,
    vertical,
    leadRoutingEmail: email,
    leadRoutingPhone: phone,
    preferredContactMethod: "EMAIL",
    onboardingStatus: "PENDING",
    serviceState: "NC",
    createdAt: current,
    updatedAt: current,
  });
  if (clientError) throw new ApiError(500, clientError.message);

  await audit(userId, "auth.signup", "user", userId, {
    vertical,
  });

  const token = randomToken();
  const expiresAt = addDays(new Date(), 30).toISOString();
  const { error: sessionError } = await supabase.from("Session").insert({
    id: crypto.randomUUID(),
    token,
    userId,
    expiresAt,
    createdAt: nowIso(),
  });

  if (sessionError) throw new ApiError(500, sessionError.message);

  return {
    ok: true,
    role,
    userId,
    session: {
      token,
      expiresAt,
    },
  };
}

async function handleAction(action: string, payload: Record<string, unknown>) {
  switch (action) {
    case "health": {
      return {
        ok: true,
        timestamp: nowIso(),
      };
    }
    case "webhooks.stripe": {
      return {
        ok: true,
        message: "Stripe webhook endpoint is wired. Local flow currently uses mock payments.",
      };
    }
    case "auth.login":
      return authLoginAction(payload);
    case "auth.logout":
      return authLogoutAction(payload);
    case "auth.signup":
      return authSignupAction(payload);
    case "auth.set_password":
      return authSetPasswordAction(payload);
    case "zip.reserve":
      return reserveZipAction(payload);
    case "checkout.mock":
      return completeMockPaymentAction(payload);
    case "contract.sign":
      return signContractAction(payload);
    case "onboarding.finalize":
      return finalizeOnboardingAction(payload);
    case "routes.update":
      return updateRoutesAction(payload);
    case "waitlist.join":
      return waitlistJoinAction(payload);
    case "admin.client.create":
      return createClientAction(payload);
    case "admin.zip.assign":
      return assignZipInternal({
        zipId: asString(payload.zipId),
        clientId: asString(payload.clientId),
        actorUserId: asString(payload.actorUserId),
        strictAssign: true,
        action: "zip.assigned_admin",
        provider: "admin_manual",
      });
    case "admin.zip.reassign":
      return assignZipInternal({
        zipId: asString(payload.zipId),
        clientId: asString(payload.clientId),
        actorUserId: asString(payload.actorUserId),
        strictAssign: false,
        action: "zip.reassigned_admin",
        provider: "admin_reassign",
      });
    case "admin.zip.release":
      return releaseZipAction(payload);
    case "admin.enroll":
      return enrollAction(payload);
    case "renewals.run":
      return runRenewalsAction(payload);
    default:
      throw new ApiError(404, `Unsupported action: ${action}`);
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  if (SHARED_SECRET) {
    const incomingSecret = request.headers.get("x-backend-secret") || "";
    if (incomingSecret !== SHARED_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: JSON_HEADERS,
      });
    }
  }

  try {
    const body = (await request.json()) as { action?: string; payload?: Record<string, unknown> };
    const action = body.action;
    if (!action) {
      throw new ApiError(400, "Missing action.");
    }

    const result = await handleAction(action, body.payload || {});
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: JSON_HEADERS,
      });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
});
