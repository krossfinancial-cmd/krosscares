import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const secure = process.env.SMTP_SECURE?.toLowerCase() === "true";
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "localhost",
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

  if (!process.env.SMTP_HOST) {
    console.log(`[MAIL:SKIPPED] ${to} | ${subject} | ${text.slice(0, 80)}`);
    return;
  }
  const from = process.env.SMTP_FROM || "noreply@krosscares.local";
  await getTransporter().sendMail({
    from,
    to,
    subject,
    html,
    text,
  });
}
