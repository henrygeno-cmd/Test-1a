"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, FileText, Trash2, Eye, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface Article {
  id: string;
  title: string;
  keyword: string;
  status: string;
  wordCount: number | null;
  seoScore: number | null;
  createdAt: string;
  slug: string | null;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  READY: "success",
  DRAFT: "secondary",
  GENERATING: "warning",
  FAILED: "destructive",
  PUBLISHED: "default",
};

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchArticles();
  }, []);

  async function fetchArticles() {
    const res = await fetch("/api/articles?limit=50");
    const data = await res.json();
    setArticles(data.articles ?? []);
    setLoading(false);
  }

  async function deleteArticle(id: string) {
    if (!confirm("Delete this article?")) return;
    await fetch(`/api/articles/${id}`, { method: "DELETE" });
    setArticles((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Article deleted" });
  }

  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.keyword.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          <p className="text-gray-500 mt-1">{articles.length} articles generated</p>
        </div>
        <Link href="/articles/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Article
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {search ? "No articles match your search" : "No articles yet"}
            </h3>
            {!search && (
              <Link href="/articles/new">
                <Button className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Generate First Article
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((article) => (
            <Card key={article.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusColors[article.status]}>
                        {article.status.toLowerCase()}
                      </Badge>
                      {article.seoScore && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          SEO {article.seoScore}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">{article.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {article.keyword} · {article.wordCount ? `${article.wordCount.toLocaleString()} words · ` : ""}{formatDate(article.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/articles/${article.id}`}>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-indigo-600">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-600"
                      onClick={() => deleteArticle(article.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
