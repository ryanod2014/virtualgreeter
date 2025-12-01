"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";
import { DateRangePicker } from "@/lib/components/date-range-picker";
import { PRICING } from "@/lib/stripe";

interface FunnelEvent {
  id: string;
  visitor_id: string;
  session_id: string | null;
  step: string;
  is_conversion: boolean;
  organization_id: string | null;
  value: number | null;
  seats: number | null;
  billing_type: string | null;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  plan: string;
  subscription_status: string;
  seat_count: number;
  mrr: number;
  created_at: string;
  users: { email: string; full_name: string }[];
}

interface FunnelDashboardClientProps {
  funnelEvents: FunnelEvent[];
  organizations: Organization[];
  defaultStartDate: string;
  defaultEndDate: string;
}

// Use centralized pricing
const PRICE_MONTHLY = PRICING.monthly.price;
const PRICE_ANNUAL = PRICING.annual.price;
const PRICE_6MONTH = PRICING.six_month.price;

export function FunnelDashboardClient({
  funnelEvents,
  organizations,
  defaultStartDate,
  defaultEndDate,
}: FunnelDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const [dateFrom, setDateFrom] = useState<Date>(
    fromParam ? parseISO(fromParam) : parseISO(defaultStartDate)
  );
  const [dateTo, setDateTo] = useState<Date>(
    toParam ? parseISO(toParam) : parseISO(defaultEndDate)
  );

  const handleDateRangeChange = (from: Date, to: Date) => {
    setDateFrom(from);
    setDateTo(to);
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", from.toISOString().split("T")[0]);
    params.set("to", to.toISOString().split("T")[0]);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const dateRange = useMemo(
    () => ({
      start: startOfDay(dateFrom),
      end: endOfDay(dateTo),
    }),
    [dateFrom, dateTo]
  );

  // Filter events by date range
  const filteredEvents = useMemo(() => {
    return funnelEvents.filter((e) =>
      isWithinInterval(parseISO(e.created_at), dateRange)
    );
  }, [funnelEvents, dateRange]);

  // Filter organizations by date range
  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) =>
      isWithinInterval(parseISO(org.created_at), dateRange)
    );
  }, [organizations, dateRange]);

  // Get unique visitor counts for pageviews (not conversions)
  const getPageviewCount = (step: string) => {
    return new Set(
      filteredEvents
        .filter((e) => e.step === step && !e.is_conversion)
        .map((e) => e.visitor_id)
    ).size;
  };

  // Get unique visitor counts for conversions
  const getConversionCount = (step: string) => {
    return new Set(
      filteredEvents
        .filter((e) => e.step === step && e.is_conversion)
        .map((e) => e.visitor_id)
    ).size;
  };

  // Get conversion events with details
  const getConversionEvents = (step: string) => {
    return filteredEvents.filter((e) => e.step === step && e.is_conversion);
  };

  // Funnel metrics
  const funnel = useMemo(() => {
    // Pageviews (unique visitors who saw each page)
    const landingViews = getPageviewCount("landing");
    const signupViews = getPageviewCount("signup");
    const paywallViews = getPageviewCount("paywall");
    const seatsViews = getPageviewCount("seats");
    const billingViews = getPageviewCount("billing");

    // Conversions (unique visitors who completed each action)
    const signupConversions = getConversionCount("signup_complete");
    const paywallConversions = getConversionCount("paywall_complete");
    const seatsConversions = getConversionCount("seats_complete");

    // Dashboard step
    const dashboardViews = getPageviewCount("dashboard");
    const dashboardConversions = getConversionCount("dashboard_reached");

    // Billing conversions
    const annualEvents = getConversionEvents("billing_annual");
    const monthlyEvents = getConversionEvents("billing_monthly");
    const sixMonthEvents = getConversionEvents("billing_6month");

    const annualCount = new Set(annualEvents.map((e) => e.visitor_id)).size;
    const monthlyCount = new Set(monthlyEvents.map((e) => e.visitor_id)).size;
    const sixMonthCount = new Set(sixMonthEvents.map((e) => e.visitor_id)).size;

    const annualSeats = annualEvents.reduce((sum, e) => sum + (e.seats || 1), 0);
    const monthlySeats = monthlyEvents.reduce((sum, e) => sum + (e.seats || 1), 0);
    const sixMonthSeats = sixMonthEvents.reduce((sum, e) => sum + (e.seats || 1), 0);

    const annualValue = annualEvents.reduce((sum, e) => sum + (e.value || annualSeats * PRICE_ANNUAL * 12), 0);
    const monthlyValue = monthlyEvents.reduce((sum, e) => sum + (e.value || monthlySeats * PRICE_MONTHLY), 0);
    const sixMonthValue = sixMonthEvents.reduce((sum, e) => sum + (e.value || sixMonthSeats * PRICE_6MONTH * 6), 0);

    const totalBuyers = annualCount + monthlyCount + sixMonthCount;
    const totalSeats = annualSeats + monthlySeats + sixMonthSeats;
    const totalValue = annualValue + monthlyValue + sixMonthValue;

    const hasData = filteredEvents.length > 0;

    return {
      // Pageviews
      landingViews,
      signupViews,
      paywallViews,
      seatsViews,
      billingViews,
      dashboardViews,
      // Conversions
      signupConversions,
      paywallConversions,
      seatsConversions,
      dashboardConversions,
      // Billing
      annualCount,
      annualSeats,
      annualValue,
      monthlyCount,
      monthlySeats,
      monthlyValue,
      sixMonthCount,
      sixMonthSeats,
      sixMonthValue,
      totalBuyers,
      totalSeats,
      totalValue,
      hasData,
    };
  }, [filteredEvents]);

  // Build buyer list from conversion events
  const buyers = useMemo(() => {
    const billingEvents = filteredEvents.filter(
      (e) =>
        (e.step === "billing_annual" ||
          e.step === "billing_monthly" ||
          e.step === "billing_6month") &&
        e.is_conversion
    );

    if (billingEvents.length > 0) {
      return billingEvents.map((e) => {
        const billingType = e.billing_type || e.step.replace("billing_", "");
        const seats = e.seats || 1;
        const value = e.value || 0;
        let period = "";

        if (billingType === "annual") {
          period = "Annual";
        } else if (billingType === "monthly") {
          period = "Monthly";
        } else if (billingType === "6month") {
          period = "6-Month";
        }

        return {
          id: e.id,
          visitor_id: e.visitor_id,
          name: e.visitor_id.substring(0, 12) + "...",
          email: null as string | null,
          seats,
          billing_type: period,
          value,
          created_at: e.created_at,
        };
      });
    }

    // Fall back to organizations if no funnel events yet
    return filteredOrgs
      .filter((o) => o.subscription_status === "active" && o.mrr > 0)
      .map((o) => {
        const user = o.users[0];
        const seats = o.seat_count || 1;
        let billingType = "Monthly";
        let value = o.mrr;

        if (o.mrr < PRICE_MONTHLY * seats * 0.8) {
          billingType = "Annual";
          value = o.mrr * 12;
        }

        return {
          id: o.id,
          visitor_id: o.id,
          name: user?.full_name || o.name,
          email: user?.email || null,
          seats,
          billing_type: billingType,
          value,
          created_at: o.created_at,
        };
      });
  }, [filteredEvents, filteredOrgs]);

  // Calculate conversion rate
  const calcRate = (num: number, denom: number) => {
    if (denom === 0) return "—";
    return ((num / denom) * 100).toFixed(1) + "%";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Funnel Stats</h2>
          <p className="text-muted-foreground text-sm">
            Pageviews, conversions & revenue
          </p>
        </div>
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onRangeChange={handleDateRangeChange}
        />
      </div>

      {/* No data indicator */}
      {!funnel.hasData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-500">
          <strong>Note:</strong> Funnel tracking will populate as users go through your funnel.
          {filteredOrgs.length > 0 && (
            <span> Showing {filteredOrgs.filter(o => o.subscription_status === "active" && o.mrr > 0).length} buyer(s) from organization data.</span>
          )}
        </div>
      )}

      {/* Funnel Table - Pageviews vs Conversions */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold">Funnel Performance</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 font-semibold">Step</th>
              <th className="text-right p-4 font-semibold">Pageviews</th>
              <th className="text-right p-4 font-semibold">Conversions</th>
              <th className="text-right p-4 font-semibold">Conv. Rate</th>
              <th className="text-right p-4 font-semibold">Dropoff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="hover:bg-muted/30">
              <td className="p-4 font-medium">1. Landing Page</td>
              <td className="p-4 text-right font-mono">{funnel.landingViews.toLocaleString()}</td>
              <td className="p-4 text-right font-mono text-muted-foreground">—</td>
              <td className="p-4 text-right text-muted-foreground">—</td>
              <td className="p-4 text-right text-muted-foreground">—</td>
            </tr>
            <tr className="hover:bg-muted/30">
              <td className="p-4 font-medium">2. Create Account</td>
              <td className="p-4 text-right font-mono">{funnel.signupViews.toLocaleString()}</td>
              <td className="p-4 text-right font-mono text-emerald-500 font-semibold">
                {funnel.signupConversions.toLocaleString()}
              </td>
              <td className="p-4 text-right font-mono text-emerald-500">
                {calcRate(funnel.signupConversions, funnel.signupViews)}
              </td>
              <td className="p-4 text-right font-mono text-red-500">
                {funnel.landingViews - funnel.signupViews > 0
                  ? `-${(funnel.landingViews - funnel.signupViews).toLocaleString()}`
                  : "—"}
              </td>
            </tr>
            <tr className="hover:bg-muted/30">
              <td className="p-4 font-medium">3. Paywall (Enter Card)</td>
              <td className="p-4 text-right font-mono">{funnel.paywallViews.toLocaleString()}</td>
              <td className="p-4 text-right font-mono text-emerald-500 font-semibold">
                {funnel.paywallConversions.toLocaleString()}
              </td>
              <td className="p-4 text-right font-mono text-emerald-500">
                {calcRate(funnel.paywallConversions, funnel.paywallViews)}
              </td>
              <td className="p-4 text-right font-mono text-red-500">
                {funnel.signupConversions - funnel.paywallViews > 0
                  ? `-${(funnel.signupConversions - funnel.paywallViews).toLocaleString()}`
                  : "—"}
              </td>
            </tr>
            <tr className="hover:bg-muted/30">
              <td className="p-4 font-medium">4. Select Seats</td>
              <td className="p-4 text-right font-mono">{funnel.seatsViews.toLocaleString()}</td>
              <td className="p-4 text-right font-mono text-emerald-500 font-semibold">
                {funnel.seatsConversions.toLocaleString()}
              </td>
              <td className="p-4 text-right font-mono text-emerald-500">
                {calcRate(funnel.seatsConversions, funnel.seatsViews)}
              </td>
              <td className="p-4 text-right font-mono text-red-500">
                {funnel.paywallConversions - funnel.seatsViews > 0
                  ? `-${(funnel.paywallConversions - funnel.seatsViews).toLocaleString()}`
                  : "—"}
              </td>
            </tr>
            <tr className="hover:bg-muted/30">
              <td className="p-4 font-medium">5. Billing Page</td>
              <td className="p-4 text-right font-mono">{funnel.billingViews.toLocaleString()}</td>
              <td className="p-4 text-right font-mono text-muted-foreground">—</td>
              <td className="p-4 text-right text-muted-foreground">—</td>
              <td className="p-4 text-right font-mono text-red-500">
                {funnel.seatsConversions - funnel.billingViews > 0
                  ? `-${(funnel.seatsConversions - funnel.billingViews).toLocaleString()}`
                  : "—"}
              </td>
            </tr>
            <tr className="hover:bg-muted/30 bg-emerald-500/5">
              <td className="p-4 font-medium">6. Annual Upgrade</td>
              <td className="p-4 text-right font-mono text-muted-foreground">—</td>
              <td className="p-4 text-right font-mono text-emerald-500 font-bold">
                {funnel.annualCount.toLocaleString()}
              </td>
              <td className="p-4 text-right font-mono text-emerald-500">
                {calcRate(funnel.annualCount, funnel.billingViews || funnel.seatsConversions)}
              </td>
              <td className="p-4 text-right font-mono text-muted-foreground">—</td>
            </tr>
            <tr className="hover:bg-muted/30 bg-violet-500/5">
              <td className="p-4 font-medium">7. 6-Month Downsell</td>
              <td className="p-4 text-right font-mono text-muted-foreground">—</td>
              <td className="p-4 text-right font-mono text-violet-500 font-bold">
                {funnel.sixMonthCount.toLocaleString()}
              </td>
              <td className="p-4 text-right font-mono text-violet-500">
                {calcRate(funnel.sixMonthCount, funnel.monthlyCount + funnel.sixMonthCount)}
              </td>
              <td className="p-4 text-right text-xs text-muted-foreground">
                of {(funnel.monthlyCount + funnel.sixMonthCount).toLocaleString()} who declined annual
              </td>
            </tr>
            <tr className="hover:bg-muted/30 bg-blue-500/5">
              <td className="p-4 font-medium">8. Monthly (no upgrade)</td>
              <td className="p-4 text-right font-mono text-muted-foreground">—</td>
              <td className="p-4 text-right font-mono text-blue-500 font-bold">
                {funnel.monthlyCount.toLocaleString()}
              </td>
              <td className="p-4 text-right font-mono text-blue-500">
                {calcRate(funnel.monthlyCount, funnel.monthlyCount + funnel.sixMonthCount)}
              </td>
              <td className="p-4 text-right text-xs text-muted-foreground">
                declined annual + downsell
              </td>
            </tr>
            <tr className="hover:bg-muted/30 bg-muted/50 font-semibold">
              <td className="p-4 font-medium">9. Dashboard Reached</td>
              <td className="p-4 text-right font-mono">{funnel.dashboardViews.toLocaleString()}</td>
              <td className="p-4 text-right font-mono text-emerald-500 font-bold">
                {funnel.dashboardConversions.toLocaleString()}
              </td>
              <td className="p-4 text-right font-mono text-emerald-500">
                {calcRate(funnel.dashboardConversions, funnel.landingViews)}
              </td>
              <td className="p-4 text-right text-xs text-muted-foreground">
                overall funnel conversion
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Billing Breakdown Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold">Billing Selection Breakdown</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 font-semibold">Billing Type</th>
              <th className="text-right p-4 font-semibold">Buyers</th>
              <th className="text-right p-4 font-semibold">Seats</th>
              <th className="text-right p-4 font-semibold">$ Value</th>
              <th className="text-right p-4 font-semibold">% of Buyers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="hover:bg-muted/30">
              <td className="p-4">
                <span className="font-medium">Annual</span>
                <span className="text-muted-foreground ml-2 text-xs">(35% off)</span>
              </td>
              <td className="p-4 text-right font-mono">{funnel.annualCount}</td>
              <td className="p-4 text-right font-mono">{funnel.annualSeats}</td>
              <td className="p-4 text-right font-mono text-emerald-500">
                ${funnel.annualValue.toLocaleString()}
              </td>
              <td className="p-4 text-right font-mono">
                {calcRate(funnel.annualCount, funnel.totalBuyers)}
              </td>
            </tr>
            <tr className="hover:bg-muted/30">
              <td className="p-4">
                <span className="font-medium">Monthly</span>
                <span className="text-muted-foreground ml-2 text-xs">($297/seat)</span>
              </td>
              <td className="p-4 text-right font-mono">{funnel.monthlyCount}</td>
              <td className="p-4 text-right font-mono">{funnel.monthlySeats}</td>
              <td className="p-4 text-right font-mono text-emerald-500">
                ${funnel.monthlyValue.toLocaleString()}
              </td>
              <td className="p-4 text-right font-mono">
                {calcRate(funnel.monthlyCount, funnel.totalBuyers)}
              </td>
            </tr>
            <tr className="hover:bg-muted/30">
              <td className="p-4">
                <span className="font-medium">6-Month</span>
                <span className="text-muted-foreground ml-2 text-xs">(40% off downsell)</span>
              </td>
              <td className="p-4 text-right font-mono">{funnel.sixMonthCount}</td>
              <td className="p-4 text-right font-mono">{funnel.sixMonthSeats}</td>
              <td className="p-4 text-right font-mono text-emerald-500">
                ${funnel.sixMonthValue.toLocaleString()}
              </td>
              <td className="p-4 text-right font-mono">
                {calcRate(funnel.sixMonthCount, funnel.totalBuyers)}
              </td>
            </tr>
            <tr className="bg-muted/50 font-semibold">
              <td className="p-4">Total</td>
              <td className="p-4 text-right font-mono">{funnel.totalBuyers}</td>
              <td className="p-4 text-right font-mono">{funnel.totalSeats}</td>
              <td className="p-4 text-right font-mono text-emerald-500">
                ${funnel.totalValue.toLocaleString()}
              </td>
              <td className="p-4 text-right font-mono">100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Buyers List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <h3 className="font-semibold">Buyer Transactions</h3>
          <span className="text-sm text-muted-foreground">
            {buyers.length} {buyers.length === 1 ? "buyer" : "buyers"}
          </span>
        </div>
        {buyers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No buyers in this date range
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-semibold">Date</th>
                  <th className="text-left p-4 font-semibold">Name/ID</th>
                  <th className="text-left p-4 font-semibold">Email</th>
                  <th className="text-right p-4 font-semibold">Seats</th>
                  <th className="text-left p-4 font-semibold">Billing</th>
                  <th className="text-right p-4 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {buyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-muted/30">
                    <td className="p-4 font-mono text-muted-foreground">
                      {format(parseISO(buyer.created_at), "MMM d, h:mm a")}
                    </td>
                    <td className="p-4 font-medium">{buyer.name}</td>
                    <td className="p-4 text-muted-foreground">
                      {buyer.email || "—"}
                    </td>
                    <td className="p-4 text-right font-mono">{buyer.seats}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          buyer.billing_type === "Annual"
                            ? "bg-emerald-500/20 text-emerald-500"
                            : buyer.billing_type === "6-Month"
                            ? "bg-violet-500/20 text-violet-500"
                            : "bg-blue-500/20 text-blue-500"
                        }`}
                      >
                        {buyer.billing_type}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-medium text-emerald-500">
                      ${buyer.value.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Key Conversion Metrics */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold">Key Conversion Rates (from Landing Page)</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          <div className="p-6 text-center">
            <div className="text-3xl font-bold font-mono text-blue-500">
              {calcRate(funnel.signupConversions, funnel.landingViews)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Landing → Account Created
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {funnel.landingViews.toLocaleString()} views → {funnel.signupConversions.toLocaleString()} signups
            </div>
          </div>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold font-mono text-amber-500">
              {calcRate(funnel.paywallConversions, funnel.landingViews)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Landing → Card Entered
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {funnel.landingViews.toLocaleString()} views → {funnel.paywallConversions.toLocaleString()} cards
            </div>
          </div>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold font-mono text-emerald-500">
              {calcRate(funnel.totalBuyers, funnel.landingViews)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Landing → Buyer
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {funnel.landingViews.toLocaleString()} views → {funnel.totalBuyers.toLocaleString()} buyers
            </div>
          </div>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold font-mono text-emerald-500">
              ${funnel.totalBuyers > 0
                ? Math.round(funnel.totalValue / funnel.totalBuyers).toLocaleString()
                : "0"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Avg Order Value
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              ${funnel.totalValue.toLocaleString()} / {funnel.totalBuyers} buyers
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-sm text-muted-foreground mb-1">
            Signup → Card
          </div>
          <div className="text-2xl font-bold font-mono">
            {calcRate(funnel.paywallConversions, funnel.signupConversions)}
          </div>
          <div className="text-xs text-muted-foreground">of account creators</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-sm text-muted-foreground mb-1">
            Card → Buyer
          </div>
          <div className="text-2xl font-bold font-mono">
            {calcRate(funnel.totalBuyers, funnel.paywallConversions)}
          </div>
          <div className="text-xs text-muted-foreground">of card entries</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-sm text-muted-foreground mb-1">
            Annual Take Rate
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500">
            {calcRate(funnel.annualCount, funnel.totalBuyers)}
          </div>
          <div className="text-xs text-muted-foreground">of all buyers</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-sm text-muted-foreground mb-1">
            6-Month Downsell
          </div>
          <div className="text-2xl font-bold font-mono text-violet-500">
            {calcRate(
              funnel.sixMonthCount,
              funnel.monthlyCount + funnel.sixMonthCount
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            of monthly decliners
          </div>
        </div>
      </div>
    </div>
  );
}
