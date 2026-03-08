import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "kc_session";
const SESSION_DAYS = 30;

function homeForRole(role: UserRole) {
  if (role === "ADMIN") return "/dashboard/admin";
  if (role === "DEALER") return "/dashboard/dealer";
  return "/dashboard/realtor";
}

function sessionExpiry() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export async function setSessionCookie(token: string, expiresAt: Date | string) {
  const expiry = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiry,
    path: "/",
  });
}

export async function getSessionToken() {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value || null;
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
  store.delete(COOKIE_NAME);
}

export async function createSession(userId: string) {
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const expiresAt = sessionExpiry();

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  await setSessionCookie(token, expiresAt);
}

export async function clearSession() {
  const token = await getSessionToken();
  if (token) {
    await prisma.session.deleteMany({
      where: { token },
    });
  }
  await clearSessionCookie();
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = await getSessionToken();
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          client: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } });
    store.delete(COOKIE_NAME);
    return null;
  }

  return session.user;
}

export async function requireUser(role?: UserRole) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect(homeForRole(user.role));
  return user;
}

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) return { ok: false as const, message: "Invalid credentials." };

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return { ok: false as const, message: "Invalid credentials." };

  await createSession(user.id);
  return { ok: true as const, role: user.role };
}
