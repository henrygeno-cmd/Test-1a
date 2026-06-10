import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "LeadFlow AI <noreply@leadflowai.com>";

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail(payload: EmailPayload) {
  return resend.emails.send({
    from: FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    reply_to: payload.replyTo,
  });
}

export function newLeadNotificationEmail(data: {
  businessName: string;
  ownerEmail: string;
  lead: { firstName: string; lastName?: string; email?: string; phone?: string; serviceType?: string; score: number; urgency: string };
  dashboardUrl: string;
}) {
  const urgencyColors: Record<string, string> = {
    EMERGENCY: "#dc2626",
    HIGH: "#ea580c",
    MEDIUM: "#ca8a04",
    LOW: "#16a34a",
  };

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🔥 New Lead Alert</h1>
      <p style="color: #bfdbfe; margin: 8px 0 0;">${data.businessName}</p>
    </div>
    <div style="padding: 32px;">
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px;">
          ${data.lead.firstName} ${data.lead.lastName || ""}
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">Service</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.lead.serviceType || "Not specified"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Phone</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.lead.phone || "Not provided"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.lead.email || "Not provided"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Lead Score</td>
            <td style="padding: 8px 0;">
              <span style="background: #dbeafe; color: #1d4ed8; padding: 2px 10px; border-radius: 20px; font-size: 13px; font-weight: 600;">${data.lead.score}/100</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Urgency</td>
            <td style="padding: 8px 0;">
              <span style="background: ${urgencyColors[data.lead.urgency] || "#ca8a04"}20; color: ${urgencyColors[data.lead.urgency] || "#ca8a04"}; padding: 2px 10px; border-radius: 20px; font-size: 13px; font-weight: 600;">${data.lead.urgency}</span>
            </td>
          </tr>
        </table>
      </div>
      <div style="text-align: center;">
        <a href="${data.dashboardUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">View Lead in Dashboard →</a>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
        Powered by LeadFlow AI • <a href="${data.dashboardUrl}/settings" style="color: #94a3b8;">Manage notifications</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: data.ownerEmail,
    subject: `🔥 New ${data.lead.urgency === "EMERGENCY" ? "EMERGENCY " : ""}Lead: ${data.lead.firstName} ${data.lead.lastName || ""} - ${data.lead.serviceType || "Service Request"}`,
    html,
  });
}

export function followUpEmail(data: {
  to: string;
  leadName: string;
  subject: string;
  body: string;
  businessName: string;
  replyTo?: string;
}) {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <p style="color: #1e293b; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${data.body.replace(/\n/g, "<br>")}</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 13px; margin: 0;">${data.businessName}</p>
  </div>
</body>
</html>`;

  return sendEmail({ to: data.to, subject: data.subject, html, replyTo: data.replyTo });
}
