import nodemailer from "nodemailer";
import { getNormalizedEnv, isProduction, requireConfiguredInProduction } from "@/lib/env";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const secure = getNormalizedEnv("SMTP_SECURE")?.toLowerCase() === "true";
  const host = requireConfiguredInProduction("SMTP_HOST", getNormalizedEnv("SMTP_HOST")) || "localhost";
  const user = getNormalizedEnv("SMTP_USER");
  const pass = getNormalizedEnv("SMTP_PASS")?.replace(/\s+/g, "");

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || (secure ? 465 : 1025)),
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
  return transporter;
}

type SendEmailOptions = {
  html?: string;
  text: string;
};

export async function sendEmail(to: string, subject: string, textOrOptions: string | SendEmailOptions) {
  const text = typeof textOrOptions === "string" ? textOrOptions : textOrOptions.text;
  const html = typeof textOrOptions === "string" ? undefined : textOrOptions.html;
  const host = getNormalizedEnv("SMTP_HOST");

  if (!host) {
    if (isProduction) {
      throw new Error("SMTP_HOST is not configured.");
    }
    console.log(`[MAIL:SKIPPED] ${to} | ${subject} | ${text.slice(0, 80)}`);
    return;
  }

  const from =
    requireConfiguredInProduction("SMTP_FROM", getNormalizedEnv("SMTP_FROM")) || "noreply@krosscares.local";

  await getTransporter().sendMail({
    from,
    to,
    subject,
    html,
    text,
  });
}
