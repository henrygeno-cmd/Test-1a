"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Plus, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

interface Keyword {
  id: string;
  keyword: string;
  intent: string | null;
  relatedKeywords: string[];
  createdAt: string;
}

const intentColors: Record<string, "default" | "secondary" | "success" | "warning"> = {
  informational: "secondary",
  commercial: "warning",
  transactional: "success",
  navigational: "default",
};

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [seed, setSeed] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/keywords")
      .then((r) => r.json())
      .then((data) => {
        setKeywords(data.keywords ?? []);
        setLoading(false);
      });
  }, []);

  async function handleResearch(e: React.FormEvent) {
    e.preventDefault();
    if (!seed.trim()) return;
    setResearching(true);
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 403) {
          toast({ title: "Upgrade required", description: "Keyword research requires a paid plan.", variant: "destructive" });
          return;
        }
        throw new Error(err.error);
      }

      const data = await res.json();
      setKeywords((prev) => [...data.keywords, ...prev]);
      setSeed("");
      toast({ title: `Found ${data.keywords.length} keyword ideas!` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setResearching(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Keyword Research</h1>
        <p className="text-gray-500 mt-1">Discover high-value keywords for your content strategy</p>
      </div>

      {/* Search form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleResearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Enter a seed keyword (e.g. 'email marketing')"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Button type="submit" disabled={researching || !seed.trim()} className="gap-2">
              {researching ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Researching...</>
              ) : (
                <><Search className="w-4 h-4" /> Research</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Keywords list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : keywords.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No keywords yet</h3>
            <p className="text-gray-500">Enter a seed keyword above to discover opportunities.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{keywords.length} keywords found</p>
          {keywords.map((kw) => (
            <Card key={kw.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{kw.keyword}</span>
                      {kw.intent && (
                        <Badge variant={intentColors[kw.intent] ?? "secondary"} className="text-xs">
                          {kw.intent}
                        </Badge>
                      )}
                    </div>
                    {kw.relatedKeywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {kw.relatedKeywords.slice(0, 4).map((rel) => (
                          <span key={rel} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {rel}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link href={`/articles/new?keyword=${encodeURIComponent(kw.keyword)}`}>
                    <Button variant="outline" size="sm" className="gap-1 text-xs">
                      <Plus className="w-3 h-3" />
                      Write
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
