"use client";

import { useState } from "react";
import { Building2, Palette, MessageSquare, Bell, Save, Loader2, CheckCircle } from "lucide-react";

const INDUSTRIES = [
  "HVAC", "ROOFING", "LANDSCAPING", "PRESSURE_WASHING", "HOME_CLEANING",
  "CAR_DETAILING", "AUTO_REPAIR", "PAINTING", "WINDOW_CLEANING", "PLUMBING", "ELECTRICAL", "OTHER"
];

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    businessName: "My Service Business",
    industry: "HVAC",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    primaryColor: "#2563eb",
    widgetGreeting: "Hi! How can we help you today?",
    widgetPosition: "bottom-right",
    widgetEnabled: true,
    notifyEmail: true,
    notifySMS: false,
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* Business Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Business Information</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name *</label>
            <input
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry</label>
            <select
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            >
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              placeholder="owner@yourbusiness.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
            <input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              placeholder="https://yourbusiness.com"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Street Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
              <input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ZIP</label>
              <input
                value={form.zipCode}
                onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Chat Widget Settings</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 text-sm">Enable Chat Widget</p>
              <p className="text-xs text-gray-500">Show the AI chat widget on your website</p>
            </div>
            <button
              onClick={() => setForm({ ...form, widgetEnabled: !form.widgetEnabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.widgetEnabled ? "bg-blue-600" : "bg-gray-200"}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.widgetEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Greeting Message</label>
            <input
              value={form.widgetGreeting}
              onChange={(e) => setForm({ ...form, widgetGreeting: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Widget Position</label>
            <select
              value={form.widgetPosition}
              onChange={(e) => setForm({ ...form, widgetPosition: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Embed Code</p>
            <p className="text-xs text-gray-500 mb-3">Paste this snippet before the closing &lt;/body&gt; tag on your website.</p>
            <code className="block text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
              {`<script src="${process.env.NEXT_PUBLIC_APP_URL || "https://app.leadflowai.com"}/widget.js" data-org-id="YOUR_ORG_ID"></script>`}
            </code>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Notifications</h2>
        </div>
        <div className="space-y-4">
          {[
            { key: "notifyEmail", label: "Email notifications", desc: "Receive an email for every new lead" },
            { key: "notifySMS", label: "SMS notifications", desc: "Receive a text for every new lead (requires phone number)" },
          ].map((n) => (
            <div key={n.key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{n.label}</p>
                <p className="text-xs text-gray-500">{n.desc}</p>
              </div>
              <button
                onClick={() => setForm({ ...form, [n.key]: !(form as any)[n.key] })}
                className={`relative w-11 h-6 rounded-full transition-colors ${(form as any)[n.key] ? "bg-blue-600" : "bg-gray-200"}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${(form as any)[n.key] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
        ) : saved ? (
          <><CheckCircle className="w-4 h-4" /> Saved!</>
        ) : (
          <><Save className="w-4 h-4" /> Save Changes</>
        )}
      </button>
    </div>
  );
}
