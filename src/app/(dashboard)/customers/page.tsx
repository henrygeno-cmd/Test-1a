"use client";

import { useState } from "react";
import { Search, Plus, Phone, Mail, Star, MoreHorizontal } from "lucide-react";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";

type Customer = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  totalSpent: number;
  jobCount: number;
  lastJobDate?: string | null;
  tags: string[];
};

const DEMO_CUSTOMERS: Customer[] = [
  { id: "1", firstName: "Robert", lastName: "Chen", email: "rob.c@email.com", phone: "(555) 070-5678", city: "Phoenix", state: "AZ", totalSpent: 8400, jobCount: 2, lastJobDate: "2026-01-15", tags: ["hvac", "repeat-customer"] },
  { id: "2", firstName: "Susan", lastName: "Park", email: "susan.p@email.com", phone: "(555) 080-9012", city: "Denver", state: "CO", totalSpent: 14200, jobCount: 4, lastJobDate: "2026-02-20", tags: ["roofing", "high-value"] },
  { id: "3", firstName: "Michael", lastName: "Davis", email: "mike.d@email.com", phone: "(555) 090-3456", city: "Nashville", state: "TN", totalSpent: 3600, jobCount: 1, lastJobDate: "2026-03-01", tags: ["landscaping"] },
  { id: "4", firstName: "Karen", lastName: "Wilson", email: "karen.w@email.com", phone: "(555) 100-7890", city: "Phoenix", state: "AZ", totalSpent: 5800, jobCount: 3, lastJobDate: "2026-01-28", tags: ["cleaning", "repeat-customer"] },
  { id: "5", firstName: "Thomas", lastName: "Brown", email: "tom.b@email.com", phone: "(555) 110-1234", city: "Denver", state: "CO", totalSpent: 2200, jobCount: 1, lastJobDate: "2025-12-10", tags: ["painting"] },
];

export default function CustomersPage() {
  const [customers] = useState(DEMO_CUSTOMERS);
  const [search, setSearch] = useState("");

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgLTV = totalRevenue / customers.length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Customers</p>
          <p className="text-3xl font-bold text-gray-900">{customers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Avg. Customer LTV</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(avgLTV)}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
          />
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Customer table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Jobs</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Spent</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Last Job</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tags</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {getInitials(customer.firstName, customer.lastName || undefined)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {customer.firstName} {customer.lastName}
                        {customer.jobCount >= 3 && <Star className="w-3.5 h-3.5 inline ml-1 fill-yellow-400 text-yellow-400" />}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {customer.phone && <span className="flex items-center gap-1 text-xs text-gray-400"><Phone className="w-3 h-3" />{customer.phone}</span>}
                        {customer.email && <span className="flex items-center gap-1 text-xs text-gray-400"><Mail className="w-3 h-3" />{customer.email}</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600">{customer.city}{customer.state ? `, ${customer.state}` : ""}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-900">{customer.jobCount} job{customer.jobCount !== 1 ? "s" : ""}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(customer.totalSpent)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">{customer.lastJobDate ? formatDate(customer.lastJobDate) : "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
