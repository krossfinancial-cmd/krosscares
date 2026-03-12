import { loadEnvConfig } from "@next/env";
import { sendEmail } from "@/lib/mailer";

loadEnvConfig(process.cwd());

async function main() {
  const to = process.env.NEW_ACCOUNT_NOTIFY_EMAIL?.trim();

  if (!to) {
    throw new Error("NEW_ACCOUNT_NOTIFY_EMAIL is not set.");
  }

  await sendEmail(
    to,
    "Kross Concepts signup email test",
    [
      "This is a test email from the Kross Concepts signup notification flow.",
      "",
      `Sent At: ${new Date().toISOString()}`,
      `SMTP Host: ${process.env.SMTP_HOST || "missing"}`,
      `SMTP User: ${process.env.SMTP_USER || "missing"}`,
    ].join("\n"),
  );

  console.log(`Test email sent to ${to}.`);
}

main().catch((error) => {
  console.error("Failed to send test email.", error);
  process.exit(1);
});
