"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, CheckCircle, Star, Zap, Shield, BarChart3,
  MessageSquare, Users, Bell, Bot, TrendingUp, Clock,
  Phone, Mail, ChevronDown, Play
} from "lucide-react";

const FEATURES = [
  {
    icon: Bot,
    title: "AI Lead Qualification",
    description:
      "Our AI scores and qualifies every lead automatically — asking the right questions, estimating project value, and flagging hot prospects before you ever pick up the phone.",
    color: "blue",
  },
  {
    icon: MessageSquare,
    title: "Omnichannel Lead Capture",
    description:
      "Capture leads from your website, chat widget, landing pages, SMS, and social media — all flowing into one intelligent dashboard.",
    color: "purple",
  },
  {
    icon: Zap,
    title: "Smart Automation Engine",
    description:
      "Send follow-up emails, SMS reminders, and appointment requests automatically. Re-engage cold leads. Notify your team when hot prospects appear.",
    color: "orange",
  },
  {
    icon: BarChart3,
    title: "Revenue Analytics",
    description:
      "Track MRR, conversion rates, cost per lead, and customer lifetime value. Know exactly which sources drive your best customers.",
    color: "green",
  },
  {
    icon: Users,
    title: "Full CRM Dashboard",
    description:
      "Manage your entire pipeline from first contact to closed job. Notes, history, follow-up tracking, and customer records — all in one place.",
    color: "teal",
  },
  {
    icon: Bell,
    title: "Instant Owner Alerts",
    description:
      "Get notified the moment a high-value or emergency lead comes in — via email, SMS, or push notification — so you never miss a big job again.",
    color: "red",
  },
];

const INDUSTRIES = [
  "HVAC", "Roofing", "Landscaping", "Pressure Washing",
  "Home Cleaning", "Car Detailing", "Auto Repair", "Painting",
  "Window Cleaning", "Plumbing", "Electrical", "Flooring",
];

const TESTIMONIALS = [
  {
    name: "Mike Rodriguez",
    company: "Rodriguez HVAC",
    location: "Phoenix, AZ",
    avatar: "MR",
    quote:
      "We went from manually calling every web lead to having the AI qualify them first. Our close rate jumped from 22% to 41% in 60 days. The emergency lead alerts alone paid for the subscription.",
    result: "+41% close rate",
    stars: 5,
  },
  {
    name: "Sarah Chen",
    company: "Evergreen Landscaping",
    location: "Denver, CO",
    avatar: "SC",
    quote:
      "The automated follow-up sequences are incredible. We used to lose half our leads to silence — now they get 5 touchpoints without us lifting a finger. We booked 23 new jobs last month from 'dead' leads.",
    result: "23 jobs from cold leads",
    stars: 5,
  },
  {
    name: "James Thompson",
    company: "TopCoat Roofing",
    location: "Nashville, TN",
    avatar: "JT",
    quote:
      "Finally a CRM built for field service businesses, not enterprise software companies. Setup took 20 minutes. The AI chat widget on my site captures leads at 2am when I'm sleeping.",
    result: "20-min setup",
    stars: 5,
  },
];

const FAQS = [
  {
    q: "How quickly can I get set up?",
    a: "Most customers are live in under 30 minutes. You add the chat widget to your website, import any existing contacts, and the AI starts working immediately. No technical skills required.",
  },
  {
    q: "Does this work for my specific industry?",
    a: "LeadFlow AI is purpose-built for local home service businesses: HVAC, roofing, landscaping, pressure washing, home cleaning, car detailing, painting, plumbing, electrical, and more. The AI qualification questions are customized per industry.",
  },
  {
    q: "What's the difference between the plans?",
    a: "Starter is great for solo operators who want automated follow-ups. Growth adds AI qualification and SMS automation — this is our most popular plan. Pro is for high-volume operations that want the full AI assistant, unlimited leads, and advanced analytics.",
  },
  {
    q: "Is there a contract or setup fee?",
    a: "No contracts, no setup fees. Month-to-month billing. Cancel anytime. Every plan starts with a 14-day free trial — no credit card required.",
  },
  {
    q: "Can I import my existing leads?",
    a: "Yes. Import from CSV, or connect your existing tools via our API. Your data migrates in minutes.",
  },
  {
    q: "How does the AI chat widget work?",
    a: "You paste one line of code on your website. The widget appears as a chat bubble. When visitors engage, the AI collects their info, asks qualifying questions, scores the lead, and notifies you instantly — all while you sleep.",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: 49,
    yearlyPrice: 39,
    description: "For solo operators launching lead automation",
    features: [
      "Up to 100 leads/month",
      "AI chat widget",
      "Basic CRM dashboard",
      "Email follow-up automation",
      "1 custom landing page",
      "Email support",
    ],
    cta: "Start Free Trial",
    popular: false,
    color: "border-gray-200",
  },
  {
    name: "Growth",
    price: 149,
    yearlyPrice: 119,
    description: "For growing businesses needing full automation",
    features: [
      "Up to 500 leads/month",
      "AI lead qualification",
      "SMS + email automation",
      "Advanced analytics",
      "5 custom landing pages",
      "3 team members",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
    color: "border-blue-500",
  },
  {
    name: "Pro",
    price: 299,
    yearlyPrice: 239,
    description: "For high-volume businesses that need unlimited scale",
    features: [
      "Unlimited leads",
      "Full AI assistant",
      "Advanced automation engine",
      "Full analytics + reporting",
      "Unlimited landing pages",
      "Unlimited team members",
      "Dedicated account manager",
    ],
    cta: "Start Free Trial",
    popular: false,
    color: "border-purple-500",
  },
];

const STATS = [
  { label: "Leads Captured", value: "2.4M+" },
  { label: "Avg. Close Rate Increase", value: "38%" },
  { label: "Time Saved Per Week", value: "12 hrs" },
  { label: "Customer Satisfaction", value: "4.9★" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">LeadFlow AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
            <Link href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
            <Link href="#testimonials" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Testimonials</Link>
            <Link href="/blog" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Blog</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden md:block">Log in</Link>
            <Link href="/sign-up" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-4 overflow-hidden">
        <div className="container mx-auto text-center max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-blue-100">
              <Zap className="w-4 h-4" />
              AI-Powered Lead Generation for Local Service Businesses
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-6">
              Stop Losing Leads.{" "}
              <span className="text-gradient">Start Closing Jobs.</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              LeadFlow AI automatically captures, qualifies, and follows up with every lead —
              so you can focus on doing the work instead of chasing it.
              Built for HVAC, roofing, landscaping, and all local service businesses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                href="/sign-up"
                className="group flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all font-semibold text-lg shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5"
              >
                Start Free 14-Day Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/demo"
                className="flex items-center gap-2 text-gray-700 px-8 py-4 rounded-xl hover:bg-gray-50 transition-all font-medium text-lg border border-gray-200"
              >
                <Play className="w-5 h-5" />
                Watch 2-Min Demo
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              No credit card required · 14-day free trial · Cancel anytime
            </p>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-16 relative"
          >
            <div className="bg-gradient-to-b from-blue-50 to-white rounded-2xl border border-blue-100 overflow-hidden shadow-2xl shadow-blue-100">
              {/* Fake dashboard preview */}
              <div className="bg-gray-900 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="flex-1 bg-gray-700 rounded mx-4 h-5" />
              </div>
              <div className="p-6 grid grid-cols-4 gap-4 bg-gray-50">
                {[
                  { label: "New Leads", value: "47", change: "+12 today", color: "blue" },
                  { label: "Qualified", value: "31", change: "66% rate", color: "green" },
                  { label: "Pipeline Value", value: "$84,200", change: "+$12k this week", color: "purple" },
                  { label: "Booked Jobs", value: "8", change: "this week", color: "orange" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className={`text-xs text-${stat.color}-600 mt-1`}>{stat.change}</p>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6 grid grid-cols-2 gap-4 bg-gray-50">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Hot Leads</p>
                  {[
                    { name: "James K.", service: "HVAC Repair", score: 94, urgency: "EMERGENCY" },
                    { name: "Lisa M.", service: "Roof Replacement", score: 87, urgency: "HIGH" },
                    { name: "Carlos R.", service: "Landscaping", score: 76, urgency: "MEDIUM" },
                  ].map((lead) => (
                    <div key={lead.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                        <p className="text-xs text-gray-500">{lead.service}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          lead.urgency === "EMERGENCY" ? "bg-red-50 text-red-600" :
                          lead.urgency === "HIGH" ? "bg-orange-50 text-orange-600" :
                          "bg-yellow-50 text-yellow-600"
                        }`}>{lead.urgency}</span>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">{lead.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">AI Automation Active</p>
                  {[
                    { name: "New Lead Welcome Sequence", status: "Running", count: "12 leads" },
                    { name: "7-Day Follow-Up Campaign", status: "Running", count: "8 leads" },
                    { name: "Cold Lead Re-engagement", status: "Running", count: "23 leads" },
                  ].map((automation) => (
                    <div key={automation.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-gray-900">{automation.name}</p>
                        <p className="text-xs text-gray-500">{automation.count}</p>
                      </div>
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full font-medium">
                        {automation.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-blue-600 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-blue-200 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wide mb-6">
            Built for local service businesses
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {INDUSTRIES.map((industry) => (
              <span
                key={industry}
                className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                {industry}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything you need to{" "}
              <span className="text-gradient">grow faster</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              LeadFlow AI handles the entire lead lifecycle — from first website visit
              to booked job — with minimal effort from you.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white border border-gray-200 rounded-2xl p-8 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl gradient-brand flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-gray-50 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How LeadFlow AI Works</h2>
            <p className="text-xl text-gray-600">From lead capture to booked job in minutes</p>
          </div>
          <div className="space-y-12">
            {[
              {
                step: "01",
                title: "Lead Captures Themselves",
                desc: "A visitor lands on your website or landing page. Your AI chat widget greets them, asks smart qualifying questions, and collects contact info — all automatically, 24/7.",
                icon: MessageSquare,
              },
              {
                step: "02",
                title: "AI Qualifies & Scores Instantly",
                desc: "Within seconds, our AI analyzes their answers, estimates the project value, assigns an urgency level, and gives the lead a quality score. No more wasting time on unqualified prospects.",
                icon: Bot,
              },
              {
                step: "03",
                title: "You Get Notified. They Get Followed Up.",
                desc: "You receive an instant alert for high-value leads. Meanwhile, the automation engine sends a personalized welcome email and starts a follow-up sequence — without you doing anything.",
                icon: Bell,
              },
              {
                step: "04",
                title: "Close the Job",
                desc: "Open your CRM, see the AI summary of the lead, read the suggested response, and book the appointment. From cold visitor to booked job in under 24 hours.",
                icon: TrendingUp,
              },
            ].map((step, i) => (
              <div key={step.step} className={`flex gap-8 items-start ${i % 2 === 1 ? "flex-row-reverse" : ""}`}>
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-6xl font-black text-gray-100 leading-none -mb-4">{step.step}</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Real results from real businesses
            </h2>
            <p className="text-xl text-gray-600">Join hundreds of local service businesses growing with LeadFlow AI</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial) => (
              <div key={testimonial.name} className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col">
                <div className="flex items-center gap-1 mb-6">
                  {Array.from({ length: testimonial.stars }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed flex-1 mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="border-t border-gray-100 pt-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center text-white font-bold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.company} · {testimonial.location}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-semibold border border-green-100">
                      {testimonial.result}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-gray-50 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              Start free for 14 days. No credit card required.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl border-2 ${plan.color} p-8 relative ${plan.popular ? "shadow-2xl shadow-blue-100 scale-105" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wide">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-500 text-sm mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-5xl font-black text-gray-900">${plan.price}</span>
                  <span className="text-gray-500">/mo</span>
                  <p className="text-sm text-green-600 mt-1">
                    Save ${(plan.price - plan.yearlyPrice) * 12}/yr with annual billing
                  </p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={`block text-center py-3 rounded-xl font-semibold transition-all ${
                    plan.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                      : "border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-500 mt-8 text-sm">
            All plans include a 14-day free trial · No setup fees · Cancel anytime
          </p>
        </div>
      </section>

      {/* Demo CTA */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="gradient-brand rounded-3xl p-12 text-center text-white">
            <h2 className="text-4xl font-bold mb-4">Ready to stop losing leads?</h2>
            <p className="text-blue-200 text-xl mb-8">
              Join 500+ local service businesses automating their lead generation.
              Start your free 14-day trial today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/sign-up"
                className="bg-white text-blue-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors"
              >
                Start Free Trial — No Card Required
              </Link>
              <Link
                href="/demo"
                className="border-2 border-blue-400 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors"
              >
                Book a Demo
              </Link>
            </div>
            <div className="flex items-center justify-center gap-8 mt-8 text-sm text-blue-200">
              <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> 14-day free trial</span>
              <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> No credit card</span>
              <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-gray-50 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <details key={faq.q} className="bg-white rounded-xl border border-gray-200 p-6 group">
                <summary className="flex items-center justify-between cursor-pointer font-semibold text-gray-900 list-none">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <p className="text-gray-600 mt-4 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white text-lg">LeadFlow AI</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                AI-powered lead generation for local service businesses. Turn visitors into booked jobs — automatically.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <a href="mailto:hello@leadflowai.com" className="flex items-center gap-2 text-sm hover:text-white transition-colors">
                  <Mail className="w-4 h-4" /> hello@leadflowai.com
                </a>
              </div>
            </div>
            {[
              { title: "Product", links: ["Features", "Pricing", "Demo", "Changelog"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-white font-semibold mb-4">{col.title}</p>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link href="#" className="text-sm hover:text-white transition-colors">{link}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">© {new Date().getFullYear()} LeadFlow AI. All rights reserved.</p>
            <p className="text-sm">Built for the trades. Powered by AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
