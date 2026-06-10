import { PrismaClient, PlanType, SubscriptionStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a demo user for testing
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@contentforge.ai" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@contentforge.ai",
      subscription: {
        create: {
          plan: PlanType.PRO,
          status: SubscriptionStatus.ACTIVE,
          articlesUsedThisMonth: 3,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  console.log("Demo user created:", demoUser.email);
  console.log("Seeding complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
