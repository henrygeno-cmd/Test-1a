"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, Check, Download, Loader2, Edit2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

interface Article {
  id: string;
  title: string;
  keyword: string;
  content: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  slug: string | null;
  wordCount: number | null;
  seoScore: number | null;
  status: string;
  tone: string;
  createdAt: string;
}

export default function ArticleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setArticle(data);
        setLoading(false);
      });
  }, [id]);

  async function copyContent() {
    if (!article?.content) return;
    await navigator.clipboard.writeText(article.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard!" });
  }

  function downloadMarkdown() {
    if (!article?.content) return;
    const blob = new Blob([article.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${article.slug ?? "article"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Article not found.</p>
        <Link href="/articles"><Button className="mt-4">Back to Articles</Button></Link>
      </div>
    );
  }

  const seoColor = article.seoScore
    ? article.seoScore >= 80 ? "text-green-600" : article.seoScore >= 60 ? "text-yellow-600" : "text-red-600"
    : "text-gray-400";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/articles">
          <Button variant="ghost" size="icon" className="text-gray-400">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant={article.status === "READY" ? "success" : "secondary"}>
              {article.status.toLowerCase()}
            </Badge>
            {article.seoScore && (
              <span className={`text-sm font-bold ${seoColor}`}>SEO Score: {article.seoScore}/100</span>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1 line-clamp-2">{article.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyContent} className="gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadMarkdown} className="gap-2">
            <Download className="w-4 h-4" />
            .md
          </Button>
        </div>
      </div>

      {/* Meta */}
      {(article.metaTitle || article.metaDescription) && (
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">SEO Meta Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {article.metaTitle && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Meta Title</p>
                <p className="text-sm text-blue-600">{article.metaTitle}</p>
              </div>
            )}
            {article.metaDescription && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Meta Description</p>
                <p className="text-sm text-gray-600">{article.metaDescription}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="flex gap-4 text-sm text-gray-500">
        <span>{article.wordCount?.toLocaleString() ?? "—"} words</span>
        <span>·</span>
        <span>Keyword: <strong>{article.keyword}</strong></span>
        <span>·</span>
        <span>Tone: {article.tone}</span>
        <span>·</span>
        <span>{formatDate(article.createdAt)}</span>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          {article.content ? (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed text-sm">
                {article.content}
              </pre>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">No content available</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
