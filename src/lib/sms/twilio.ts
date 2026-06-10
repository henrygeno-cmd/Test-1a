import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = process.env.TWILIO_PHONE_NUMBER!;

export async function sendSMS(to: string, body: string) {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.warn("Twilio not configured, skipping SMS");
    return null;
  }
  return client.messages.create({ body, from: FROM, to });
}

export function newLeadSMS(data: { ownerPhone: string; leadName: string; service?: string; score: number }) {
  const body = `🔥 New lead from LeadFlow!\n${data.leadName} - ${data.service || "Service Request"}\nScore: ${data.score}/100\nCheck your dashboard now.`;
  return sendSMS(data.ownerPhone, body);
}

export function appointmentReminderSMS(data: {
  customerPhone: string;
  customerName: string;
  businessName: string;
  appointmentDate: Date;
  serviceType: string;
}) {
  const dateStr = data.appointmentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const body = `Hi ${data.customerName}! This is a reminder from ${data.businessName}. Your ${data.serviceType} appointment is scheduled for ${dateStr}. Reply CONFIRM to confirm or call us to reschedule.`;
  return sendSMS(data.customerPhone, body);
}

export function followUpSMS(data: {
  to: string;
  body: string;
}) {
  return sendSMS(data.to, data.body);
}
