import { UserRole } from "@prisma/client";
import { sendEmail } from "@/lib/mailer";

type ZipClaimNotificationArgs = {
  fullName: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  role: UserRole | "REALTOR" | "DEALER";
  zipCode?: string | null;
  claimStatus?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function businessTypeLabel(role: ZipClaimNotificationArgs["role"]) {
  return role === "DEALER" ? "Dealer" : "Realtor";
}

function buildSubject(args: ZipClaimNotificationArgs) {
  if (args.zipCode && args.claimStatus === "Reserved") {
    return `ZIP Claimed: ${args.zipCode} - ${args.fullName}`;
  }

  if (args.zipCode) {
    return `ZIP Claim Update: ${args.zipCode} - ${args.fullName}`;
  }

  return `New Zip Client - ${args.fullName}`;
}

export async function sendZipClaimNotification(args: ZipClaimNotificationArgs) {
  const notifyEmail = process.env.NEW_ACCOUNT_NOTIFY_EMAIL?.trim();
  if (!notifyEmail) {
    return;
  }

  const fields = [
    ["Full Name", args.fullName],
    ["Email Address", args.email],
    ["Phone", args.phone?.trim() || "-"],
    ["Business Type", businessTypeLabel(args.role)],
    ["Company Name", args.companyName?.trim() || "-"],
    ...(args.zipCode ? [["Claimed ZIP Code", args.zipCode]] : []),
    ...(args.claimStatus ? [["ZIP Claim Status", args.claimStatus]] : []),
  ] as const;

  const introLine =
    args.zipCode && args.claimStatus === "Reserved"
      ? `${args.fullName} claimed ZIP ${args.zipCode}.`
      : args.zipCode
        ? `There is an update for ZIP ${args.zipCode}.`
        : `${args.fullName} submitted a new account request.`;

  await sendEmail(notifyEmail, buildSubject(args), {
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#102a43;max-width:720px;">
        <p style="margin:0 0 16px 0;font-size:16px;font-weight:700;">
          ${escapeHtml(introLine)}
        </p>
      </div>
      <table style="border-collapse:collapse;width:100%;max-width:720px;font-family:Arial,sans-serif;font-size:14px;">
        <tbody>
          ${fields
            .map(
              ([label, value]) => `
                <tr>
                  <th style="border:1px solid #d9e2f2;background:#f5f8ff;padding:10px 12px;text-align:left;width:220px;">
                    ${escapeHtml(label)}
                  </th>
                  <td style="border:1px solid #d9e2f2;padding:10px 12px;">
                    ${escapeHtml(value)}
                  </td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    `,
    text: [introLine, "", ...fields.map(([label, value]) => `${label}: ${value}`)].join("\n"),
  });
}
