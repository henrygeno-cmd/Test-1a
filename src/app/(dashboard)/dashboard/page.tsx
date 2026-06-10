import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma/db";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentLeads } from "@/components/dashboard/recent-leads";
import { LeadSourceChart } from "@/components/dashboard/lead-source-chart";
import { AutomationStatus } from "@/components/dashboard/automation-status";
import { AIInsights } from "@/components/dashboard/ai-insights";
import { formatCurrency } from "@/lib/utils";

async function getDashboardData(orgId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

  const [
    totalLeads,
    newToday,
    newThisMonth,
    qualifiedLeads,
    highValueLeads,
    closedWon,
    recentLeads,
    leadsByStatus,
    leadsBySource,
    activeAutomations,
  ] = await Promise.all([
    db.lead.count({ where: { organizationId: orgId } }),
    db.lead.count({ where: { organizationId: orgId, createdAt: { gte: startOfToday } } }),
    db.lead.count({ where: { organizationId: orgId, createdAt: { gte: startOfMonth } } }),
    db.lead.count({ where: { organizationId: orgId, isQualified: true } }),
    db.lead.count({ where: { organizationId: orgId, isHighValue: true } }),
    db.lead.findMany({
      where: { organizationId: orgId, status: "CLOSED_WON" },
      select: { estimatedValue: true },
    }),
    db.lead.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        serviceType: true, status: true, urgency: true, score: true,
        estimatedValue: true, source: true, createdAt: true,
      },
    }),
    db.lead.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: { id: true },
    }),
    db.lead.groupBy({
      by: ["source"],
      where: { organizationId: orgId },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    db.automationRule.count({ where: { organizationId: orgId, isActive: true } }),
  ]);

  const totalRevenue = closedWon.reduce(
    (sum, l) => sum + (l.estimatedValue || 0),
    0
  );
  const conversionRate =
    totalLeads > 0
      ? Math.round((closedWon.length / totalLeads) * 100)
      : 0;

  return {
    stats: {
      totalLeads,
      newToday,
      newThisMonth,
      qualifiedLeads,
      highValueLeads,
      totalRevenue,
      conversionRate,
      activeAutomations,
    },
    recentLeads,
    leadsByStatus: leadsByStatus.map((l) => ({ status: l.status, count: l._count.id })),
    leadsBySource: leadsBySource.slice(0, 6).map((l) => ({ source: l.source, count: l._count.id })),
  };
}

export default async function DashboardPage() {
  const { userId } = await auth();

  // In production: look up org by clerkUserId. For demo, use a placeholder.
  let data;
  try {
    const member = await db.orgMember.findUnique({
      where: { clerkUserId: userId! },
      select: { organizationId: true },
    });
    data = member ? await getDashboardData(member.organizationId) : null;
  } catch {
    data = null;
  }

  // Demo data for new users
  const stats = data?.stats ?? {
    totalLeads: 47,
    newToday: 3,
    newThisMonth: 23,
    qualifiedLeads: 31,
    highValueLeads: 8,
    totalRevenue: 84200,
    conversionRate: 34,
    activeAutomations: 5,
  };

  const recentLeads = data?.recentLeads ?? [
    { id: "1", firstName: "James", lastName: "K.", email: "james@example.com", phone: "555-0101", serviceType: "HVAC Repair", status: "NEW", urgency: "EMERGENCY", score: 94, estimatedValue: 3200, source: "WEBSITE", createdAt: new Date() },
    { id: "2", firstName: "Lisa", lastName: "M.", email: "lisa@example.com", phone: "555-0102", serviceType: "Roof Replacement", status: "QUALIFIED", urgency: "HIGH", score: 87, estimatedValue: 14500, source: "CHAT_WIDGET", createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { id: "3", firstName: "Carlos", lastName: "R.", email: "carlos@example.com", phone: "555-0103", serviceType: "Landscaping", status: "CONTACTED", urgency: "MEDIUM", score: 76, estimatedValue: 2800, source: "LANDING_PAGE", createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
    { id: "4", firstName: "Amy", lastName: "T.", email: "amy@example.com", phone: "555-0104", serviceType: "House Painting", status: "PROPOSAL_SENT", urgency: "MEDIUM", score: 71, estimatedValue: 4200, source: "REFERRAL", createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    { id: "5", firstName: "David", lastName: "W.", email: "david@example.com", phone: "555-0105", serviceType: "Window Cleaning", status: "NEW", urgency: "LOW", score: 55, estimatedValue: 450, source: "ORGANIC_SEARCH", createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
  ];

  const leadsBySource = data?.leadsBySource ?? [
    { source: "WEBSITE", count: 18 },
    { source: "CHAT_WIDGET", count: 12 },
    { source: "LANDING_PAGE", count: 9 },
    { source: "REFERRAL", count: 5 },
    { source: "ORGANIC_SEARCH", count: 3 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome banner for new users */}
      {!data && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-blue-900">Welcome to LeadFlow AI! 🎉</p>
            <p className="text-sm text-blue-700 mt-0.5">
              You&apos;re viewing sample data. Complete your business setup to start capturing real leads.
            </p>
          </div>
          <a
            href="/settings"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Setup Business →
          </a>
        </div>
      )}

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent leads - 2/3 width */}
        <div className="lg:col-span-2">
          <RecentLeads leads={recentLeads as any} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <LeadSourceChart data={leadsBySource} />
          <AutomationStatus activeCount={stats.activeAutomations} />
        </div>
      </div>

      {/* AI Insights */}
      <AIInsights
        stats={stats}
        recentLeads={recentLeads as any}
      />
    </div>
  );
}
