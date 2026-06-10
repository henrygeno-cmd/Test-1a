import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: "demo-hvac-pros" },
    update: {},
    create: {
      name: "Phoenix HVAC Pros",
      slug: "demo-hvac-pros",
      industry: "HVAC",
      email: "owner@phoenixhvacpros.com",
      phone: "(602) 555-0100",
      website: "https://phoenixhvacpros.com",
      address: "4500 N Central Ave",
      city: "Phoenix",
      state: "AZ",
      zipCode: "85012",
      primaryColor: "#2563eb",
      widgetGreeting: "Hi! Need HVAC help? We're here 24/7.",
    },
  });

  console.log(`✓ Created organization: ${org.name}`);

  // Create demo leads
  const leads = [
    { firstName: "James", lastName: "Kowalski", email: "james.k@example.com", phone: "(555) 010-1234", serviceType: "HVAC Repair", status: "NEW" as const, urgency: "EMERGENCY" as const, score: 94, estimatedValue: 3200, source: "WEBSITE" as const, isHighValue: true, isQualified: true, aiSummary: "Emergency HVAC failure, homeowner with young children, needs same-day service. High close probability." },
    { firstName: "Lisa", lastName: "Martinez", email: "lisa.m@example.com", phone: "(555) 020-5678", serviceType: "AC Installation", status: "QUALIFIED" as const, urgency: "HIGH" as const, score: 87, estimatedValue: 8400, source: "CHAT_WIDGET" as const, isHighValue: true, isQualified: true, aiSummary: "Full AC system replacement, 2400 sq ft home, has financing pre-approval. Strong buying signals." },
    { firstName: "Carlos", lastName: "Rodriguez", email: "carlos.r@example.com", phone: "(555) 030-9012", serviceType: "HVAC Maintenance", status: "CONTACTED" as const, urgency: "MEDIUM" as const, score: 71, estimatedValue: 450, source: "LANDING_PAGE" as const, isHighValue: false, isQualified: true, aiSummary: "Annual maintenance package interest. Good candidate for recurring service contract." },
    { firstName: "Amy", lastName: "Thompson", email: "amy.t@example.com", phone: "(555) 040-3456", serviceType: "Duct Cleaning", status: "PROPOSAL_SENT" as const, urgency: "LOW" as const, score: 58, estimatedValue: 800, source: "REFERRAL" as const, isHighValue: false, isQualified: true, aiSummary: "Referred by existing customer. Follow up needed on proposal sent 3 days ago." },
  ];

  for (const leadData of leads) {
    const lead = await prisma.lead.create({
      data: { organizationId: org.id, ...leadData },
    });
    await prisma.leadActivity.create({
      data: { leadId: lead.id, type: "CREATED", description: `Lead created via ${leadData.source}` },
    });
    console.log(`  ✓ Lead: ${lead.firstName} ${lead.lastName}`);
  }

  // Create automation rules
  const automations = [
    {
      name: "New Lead Welcome Sequence",
      trigger: "LEAD_CREATED" as const,
      conditions: { source: "any" },
      actions: [
        { type: "send_email", delay: 0, subject: "We received your request!", template: "welcome" },
        { type: "send_sms", delay: 120, message: "Hi {{name}}! This is {{business}}. We got your request and will call you within the hour." },
        { type: "notify_owner", delay: 0 },
      ],
      isActive: true,
    },
    {
      name: "High-Value Lead Alert",
      trigger: "LEAD_SCORE_THRESHOLD" as const,
      conditions: { score: { gte: 80 } },
      actions: [
        { type: "send_sms_to_owner", message: "🔥 HOT LEAD: {{name}} - {{service}} - Score: {{score}}" },
        { type: "update_urgency", value: "HIGH" },
      ],
      isActive: true,
    },
    {
      name: "7-Day Cold Lead Re-engagement",
      trigger: "NO_CONTACT_DAYS" as const,
      conditions: { days: 7, statuses: ["NEW", "CONTACTED"] },
      actions: [
        { type: "send_sms", message: "Hi {{name}}, still thinking about your {{service}} project? We have availability this week. Call us: {{phone}}" },
        { type: "send_email", delay: 2880, subject: "Still interested in your project?", template: "re_engagement" },
      ],
      isActive: true,
    },
  ];

  for (const auto of automations) {
    await prisma.automationRule.create({
      data: { organizationId: org.id, ...auto },
    });
    console.log(`  ✓ Automation: ${auto.name}`);
  }

  // Create subscription
  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      stripeCustomerId: "cus_demo_" + org.id,
      plan: "GROWTH",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("✅ Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
