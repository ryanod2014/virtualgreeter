"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  Users,
  Phone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { SubscriptionPlan, SubscriptionStatus } from "@ghost-greeter/domain/database.types";

interface OrgWithStats {
  id: string;
  name: string;
  slug: string;
  plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  seat_count: number;
  created_at: string;
  updated_at: string;
  userCount: number;
  agentCount: number;
  totalCalls: number;
  callsThisMonth: number;
  lastActivity: string;
}

interface OrganizationsClientProps {
  organizations: OrgWithStats[];
}

type SortField = "name" | "plan" | "userCount" | "agentCount" | "totalCalls" | "callsThisMonth" | "created_at" | "lastActivity";
type SortDirection = "asc" | "desc";

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  paused: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  free: "bg-slate-500/10 text-slate-500",
  starter: "bg-blue-500/10 text-blue-500",
  pro: "bg-purple-500/10 text-purple-500",
  enterprise: "bg-amber-500/10 text-amber-500",
};

export function OrganizationsClient({ organizations }: OrganizationsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "all">("all");
  const [planFilter, setPlanFilter] = useState<SubscriptionPlan | "all">("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Filter and sort organizations
  const filteredOrgs = useMemo(() => {
    let result = [...organizations];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (org) =>
          org.name.toLowerCase().includes(query) ||
          org.slug.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((org) => org.subscription_status === statusFilter);
    }

    // Apply plan filter
    if (planFilter !== "all") {
      result = result.filter((org) => org.plan === planFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];

      // Handle date strings
      if (sortField === "created_at" || sortField === "lastActivity") {
        aVal = new Date(aVal as string).getTime();
        bVal = new Date(bVal as string).getTime();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [organizations, searchQuery, statusFilter, planFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-muted-foreground/50" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4 text-primary" />
    ) : (
      <ChevronDown className="w-4 h-4 text-primary" />
    );
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold">All Organizations</h2>
        <p className="text-muted-foreground">
          {organizations.length} organizations on the platform
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organizations..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | "all")}
            className="px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Plan Filter */}
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as SubscriptionPlan | "all")}
          className="px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
        >
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>

        {/* Results count */}
        <span className="text-sm text-muted-foreground">
          {filteredOrgs.length} results
        </span>
      </div>

      {/* Organizations Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors"
                  >
                    Organization
                    <SortIcon field="name" />
                  </button>
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort("plan")}
                    className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors"
                  >
                    Plan
                    <SortIcon field="plan" />
                  </button>
                </th>
                <th className="text-center p-4">Status</th>
                <th className="text-center p-4">
                  <button
                    onClick={() => handleSort("userCount")}
                    className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors mx-auto"
                  >
                    Users
                    <SortIcon field="userCount" />
                  </button>
                </th>
                <th className="text-center p-4">
                  <button
                    onClick={() => handleSort("agentCount")}
                    className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors mx-auto"
                  >
                    Agents
                    <SortIcon field="agentCount" />
                  </button>
                </th>
                <th className="text-center p-4">
                  <button
                    onClick={() => handleSort("totalCalls")}
                    className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors mx-auto"
                  >
                    Total Calls
                    <SortIcon field="totalCalls" />
                  </button>
                </th>
                <th className="text-center p-4">
                  <button
                    onClick={() => handleSort("callsThisMonth")}
                    className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors mx-auto"
                  >
                    This Month
                    <SortIcon field="callsThisMonth" />
                  </button>
                </th>
                <th className="text-right p-4">
                  <button
                    onClick={() => handleSort("lastActivity")}
                    className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors ml-auto"
                  >
                    Last Activity
                    <SortIcon field="lastActivity" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No organizations found</p>
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr
                    key={org.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground">{org.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${PLAN_COLORS[org.plan]}`}
                      >
                        {org.plan}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize border ${STATUS_COLORS[org.subscription_status]}`}
                      >
                        {org.subscription_status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{org.userCount}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="font-medium">{org.agentCount}</span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{org.totalCalls.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`font-medium ${
                          org.callsThisMonth > 0 ? "text-green-500" : "text-muted-foreground"
                        }`}
                      >
                        {org.callsThisMonth}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm text-muted-foreground">
                        {timeAgo(org.lastActivity)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

