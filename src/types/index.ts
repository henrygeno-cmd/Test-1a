export type {
  Organization,
  OrgMember,
  Lead,
  LeadActivity,
  Message,
  Customer,
  Job,
  Campaign,
  AutomationRule,
  Subscription,
  LandingPage,
} from "@prisma/client";

export type {
  Industry,
  OrgRole,
  LeadSource,
  LeadStatus,
  Urgency,
  ActivityType,
  Direction,
  Channel,
  JobStatus,
  CampaignType,
  CampaignStatus,
  TriggerType,
  PlanTier,
  SubscriptionStatus,
} from "@prisma/client";

// ─── Extended types with relations ─────────────────────────
export type LeadWithRelations = import("@prisma/client").Lead & {
  activities?: import("@prisma/client").LeadActivity[];
  messages?: import("@prisma/client").Message[];
  customer?: import("@prisma/client").Customer | null;
};

export type CustomerWithRelations = import("@prisma/client").Customer & {
  leads?: import("@prisma/client").Lead[];
  jobs?: import("@prisma/client").Job[];
};

// ─── API Response types ─────────────────────────────────────
export type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

// ─── Dashboard stats ────────────────────────────────────────
export type DashboardStats = {
  totalLeads: number;
  newLeadsToday: number;
  newLeadsThisMonth: number;
  qualifiedLeads: number;
  conversionRate: number;
  totalRevenue: number;
  avgLeadScore: number;
  highValueLeads: number;
  leadsThisWeek: number[];
  leadsByStatus: { status: string; count: number }[];
  leadsBySource: { source: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  topServices: { service: string; count: number }[];
};

// ─── AI types ───────────────────────────────────────────────
export type QualificationResult = {
  score: number;
  isQualified: boolean;
  isHighValue: boolean;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
  estimatedValue: number;
  summary: string;
  suggestedResponse: string;
  nextAction: string;
  questions: string[];
};

export type AISuggestion = {
  type: "follow_up" | "response" | "coaching" | "alert";
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
};

// ─── Stripe types ────────────────────────────────────────────
export type PlanFeatures = {
  leads: number | "unlimited";
  smsAutomation: boolean;
  emailAutomation: boolean;
  aiQualification: boolean;
  aiAssistant: boolean;
  customLandingPages: number;
  teamMembers: number;
  analytics: "basic" | "advanced" | "full";
  support: "email" | "priority" | "dedicated";
};

export type Plan = {
  id: string;
  name: string;
  tier: "FREE" | "STARTER" | "GROWTH" | "PRO";
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: PlanFeatures;
  highlights: string[];
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
};
