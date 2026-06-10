"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function NewArticlePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    keyword: "",
    title: "",
    tone: "professional",
    targetAudience: "",
    wordCount: 1500,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.keyword.trim()) return;

    setLoading(true);
    try {
      // Create article
      const createRes = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error ?? "Failed to create article");
      }

      const article = await createRes.json();

      // Trigger generation
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.id }),
      });

      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.error ?? "Generation failed");
      }

      const generated = await genRes.json();
      toast({ title: "Article generated successfully!" });
      router.push(`/articles/${generated.id}`);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/articles">
          <Button variant="ghost" size="icon" className="text-gray-400">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generate Article</h1>
          <p className="text-gray-500 text-sm mt-0.5">AI will write a complete SEO-optimized article</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Article Details</CardTitle>
          <CardDescription>
            The more context you provide, the better the output.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Keyword <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. best email marketing tools for small business"
                value={form.keyword}
                onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">This will be the primary keyword for SEO optimization</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Article Title (optional)
              </label>
              <input
                type="text"
                placeholder="Leave blank to auto-generate"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                <select
                  value={form.tone}
                  onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="technical">Technical</option>
                  <option value="conversational">Conversational</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Word Count</label>
                <select
                  value={form.wordCount}
                  onChange={(e) => setForm((f) => ({ ...f, wordCount: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value={800}>~800 words</option>
                  <option value={1500}>~1,500 words</option>
                  <option value={2000}>~2,000 words</option>
                  <option value={2500}>~2,500 words</option>
                  <option value={3000}>~3,000 words</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Audience (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. small business owners, marketing managers"
                value={form.targetAudience}
                onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full gap-2 h-12 text-base">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating article... (30-60 seconds)
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Generate Article
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-indigo-50 border-indigo-100">
        <CardContent className="pt-4 pb-4">
          <h3 className="text-sm font-semibold text-indigo-900 mb-2">What you&apos;ll get:</h3>
          <ul className="space-y-1 text-sm text-indigo-700">
            <li>• 1,500+ word article with structured headings</li>
            <li>• SEO-optimized title and meta description</li>
            <li>• Natural keyword integration at ideal density</li>
            <li>• SEO score + readability analysis</li>
            <li>• Ready to copy into any CMS</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
