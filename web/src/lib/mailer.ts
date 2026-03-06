import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "localhost",
    port: Number(process.env.SMTP_PORT || 1025),
    secure: false,
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, text: string) {
  if (!process.env.SMTP_HOST) {
    console.log(`[MAIL:SKIPPED] ${to} | ${subject} | ${text.slice(0, 80)}`);
    return;
  }
  const from = process.env.SMTP_FROM || "noreply@krosscares.local";
  await getTransporter().sendMail({
    from,
    to,
    subject,
    text,
  });
}
