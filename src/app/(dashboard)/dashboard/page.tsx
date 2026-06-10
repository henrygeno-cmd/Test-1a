"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Search, TrendingUp, Zap, Plus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";

interface DashboardStats {
  totalArticles: number;
  readyArticles: number;
  thisMonthArticles: number;
  articlesUsed: number;
  monthlyLimit: number;
  plan: string;
  totalKeywords: number;
  recentArticles: Array<{
    id: string;
    title: string;
    keyword: string;
    status: string;
    seoScore: number | null;
    wordCount: number | null;
    createdAt: string;
  }>;
}

const statusColors: Record<string, string> = {
  READY: "success",
  DRAFT: "secondary",
  GENERATING: "warning",
  FAILED: "destructive",
  PUBLISHED: "default",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const usagePercent = stats ? (stats.articlesUsed / stats.monthlyLimit) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Your content production overview</p>
        </div>
        <Link href="/articles/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Article
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.totalArticles ?? 0}</div>
            <p className="text-sm text-gray-500 mt-1">{stats?.readyArticles ?? 0} ready to publish</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.articlesUsed ?? 0}</div>
            <p className="text-sm text-gray-500 mt-1">of {stats?.monthlyLimit ?? 0} articles used</p>
            <Progress value={usagePercent} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Keywords Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.totalKeywords ?? 0}</div>
            <p className="text-sm text-gray-500 mt-1">in your keyword bank</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 capitalize">{stats?.plan?.toLowerCase() ?? "Free"}</div>
            <Link href="/billing" className="text-sm text-indigo-600 hover:underline mt-1 block">
              {stats?.plan === "FREE" ? "Upgrade plan →" : "Manage billing →"}
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Zap,
            title: "Generate Article",
            description: "Create a new SEO-optimized article with AI",
            href: "/articles/new",
            color: "indigo",
          },
          {
            icon: Search,
            title: "Keyword Research",
            description: "Find high-value keywords for your niche",
            href: "/keywords",
            color: "purple",
          },
          {
            icon: FileText,
            title: "View All Articles",
            description: "Manage and edit your generated content",
            href: "/articles",
            color: "blue",
          },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
              <CardContent className="pt-6">
                <div className={`w-10 h-10 bg-${action.color}-100 rounded-lg flex items-center justify-center mb-3`}>
                  <action.icon className={`w-5 h-5 text-${action.color}-600`} />
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{action.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Articles */}
      {stats?.recentArticles && stats.recentArticles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Articles</CardTitle>
              <Link href="/articles">
                <Button variant="ghost" size="sm" className="gap-1 text-indigo-600">
                  View all <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentArticles.map((article) => (
                <Link key={article.id} href={`/articles/${article.id}`}>
                  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-medium text-gray-900 truncate">{article.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {article.keyword} · {formatDate(article.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {article.seoScore && (
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">{article.seoScore}</div>
                          <div className="text-xs text-gray-400">SEO</div>
                        </div>
                      )}
                      {article.wordCount && (
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">{article.wordCount.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">words</div>
                        </div>
                      )}
                      <Badge variant={statusColors[article.status] as any}>
                        {article.status.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {stats?.recentArticles?.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles yet</h3>
            <p className="text-gray-500 mb-6">Generate your first AI-powered SEO article to get started.</p>
            <Link href="/articles/new">
              <Button className="gap-2">
                <Zap className="w-4 h-4" />
                Generate Your First Article
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
