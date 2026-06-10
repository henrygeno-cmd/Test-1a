import Link from "next/link";
import { ArrowRight, Zap, BarChart3, Search, FileText, Check, Star } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">ContentForge AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">Features</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</a>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Login</Link>
            <Link
              href="/register"
              className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm px-4 py-2 rounded-full mb-6">
            <Zap className="w-4 h-4" />
            <span>Powered by GPT-4 · 7-day free trial</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            SEO Content That{" "}
            <span className="text-indigo-600">Actually Ranks</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Generate 1,500+ word SEO articles in under 2 minutes. Built-in keyword research,
            SEO scoring, and one-click publishing. Used by 500+ agencies and freelancers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors"
            >
              See Pricing
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">No credit card required · Cancel anytime</p>
        </div>

        {/* Social proof */}
        <div className="max-w-3xl mx-auto mt-16 flex flex-wrap justify-center gap-8 text-center">
          {[
            { value: "500+", label: "Active users" },
            { value: "50K+", label: "Articles generated" },
            { value: "4.9/5", label: "Average rating" },
            { value: "87%", label: "Time saved vs manual" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-indigo-600">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need to scale content
            </h2>
            <p className="text-xl text-gray-600">
              From keyword research to published article in minutes, not days.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Search,
                title: "Keyword Research",
                description:
                  "Discover high-value keywords with search intent analysis. Find opportunities your competitors are missing.",
              },
              {
                icon: Zap,
                title: "AI Article Generation",
                description:
                  "Generate 1,500–3,000 word articles optimized for search. Structured headings, natural keyword integration, and engaging content.",
              },
              {
                icon: BarChart3,
                title: "SEO Score",
                description:
                  "Get an instant SEO score for every article. See exactly what to improve before publishing.",
              },
              {
                icon: FileText,
                title: "Multiple Formats",
                description:
                  "Export to Markdown, HTML, or plain text. Integrate with WordPress, Ghost, or any CMS.",
              },
              {
                icon: Zap,
                title: "Bulk Generation",
                description:
                  "Generate 10+ articles from a keyword list with one click. Perfect for content agencies at scale.",
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                description:
                  "Track your content output, SEO scores, and usage. Know exactly what you're producing each month.",
              },
            ].map((feature) => (
              <div key={feature.title} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-gray-600">Start free. Upgrade when you need more.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Starter",
                price: "$29",
                period: "/month",
                description: "Perfect for bloggers and solopreneurs",
                features: [
                  "10 articles per month",
                  "Advanced SEO scoring",
                  "Keyword research tool",
                  "All export formats",
                  "Email support",
                ],
                cta: "Start Free Trial",
                popular: false,
              },
              {
                name: "Pro",
                price: "$79",
                period: "/month",
                description: "For content teams and growing agencies",
                features: [
                  "50 articles per month",
                  "Everything in Starter",
                  "Bulk generation",
                  "Custom tone & style",
                  "Priority support",
                ],
                cta: "Start Free Trial",
                popular: true,
              },
              {
                name: "Agency",
                price: "$199",
                period: "/month",
                description: "Unlimited scale for agencies",
                features: [
                  "Unlimited articles",
                  "Everything in Pro",
                  "API access",
                  "White-label exports",
                  "5 team seats",
                ],
                cta: "Start Free Trial",
                popular: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 ${
                  plan.popular
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-105"
                    : "bg-white border border-gray-200"
                }`}
              >
                {plan.popular && (
                  <div className="inline-flex items-center gap-1 bg-white/20 text-white text-xs px-3 py-1 rounded-full mb-4">
                    <Star className="w-3 h-3" />
                    Most Popular
                  </div>
                )}
                <h3 className={`text-xl font-bold mb-1 ${plan.popular ? "text-white" : "text-gray-900"}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-4 ${plan.popular ? "text-indigo-200" : "text-gray-500"}`}>
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-bold ${plan.popular ? "text-white" : "text-gray-900"}`}>
                    {plan.price}
                  </span>
                  <span className={plan.popular ? "text-indigo-200" : "text-gray-500"}>{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className={`w-4 h-4 ${plan.popular ? "text-indigo-200" : "text-indigo-600"}`} />
                      <span className={`text-sm ${plan.popular ? "text-indigo-100" : "text-gray-600"}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-3 rounded-xl font-semibold transition-colors ${
                    plan.popular
                      ? "bg-white text-indigo-600 hover:bg-indigo-50"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-500 mt-8">All plans include a 7-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Trusted by content creators worldwide
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah M.",
                role: "SEO Agency Owner",
                text: "ContentForge cut our content production time by 80%. We went from 10 articles/week to 50 without hiring anyone new.",
              },
              {
                name: "James K.",
                role: "Freelance Writer",
                text: "I was skeptical about AI writing tools, but the SEO quality here is genuinely impressive. My clients can't tell the difference.",
              },
              {
                name: "Lisa T.",
                role: "Marketing Director",
                text: "We use ContentForge for all our blog content now. The keyword research alone paid for itself in the first week.",
              },
            ].map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                  <div className="text-gray-500 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Start generating content today
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join 500+ creators using ContentForge AI to scale their content operations.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors"
          >
            Start Your Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-gray-500 text-sm mt-4">7-day free trial · No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">ContentForge AI</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-900">Privacy</a>
            <a href="#" className="hover:text-gray-900">Terms</a>
            <a href="#" className="hover:text-gray-900">Contact</a>
          </div>
          <p className="text-sm text-gray-400">© 2026 ContentForge AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
