"use client";

import { useState, useMemo } from "react";
import {
  Target,
  Search,
  Check,
  Loader2,
  Settings,
  Building2,
  Phone,
  Eye,
  AlertTriangle,
  Info,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { GreetNowFacebookPixelSettings, SubscriptionPlan, SubscriptionStatus } from "@ghost-greeter/domain";

interface OrgWithStats {
  id: string;
  name: string;
  slug: string;
  plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  greetnow_retargeting_enabled: boolean;
  created_at: string;
  totalCalls: number;
  completedCalls: number;
  pageviews: number;
}

interface RetargetingClientProps {
  pixelSettings: GreetNowFacebookPixelSettings;
  organizations: OrgWithStats[];
  enabledCount: number;
}

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: "bg-green-500/10 text-green-500",
  trialing: "bg-blue-500/10 text-blue-500",
  paused: "bg-amber-500/10 text-amber-500",
  cancelled: "bg-red-500/10 text-red-500",
};

export function RetargetingClient({
  pixelSettings: initialPixelSettings,
  organizations: initialOrganizations,
  enabledCount: initialEnabledCount,
}: RetargetingClientProps) {
  const [pixelSettings, setPixelSettings] = useState(initialPixelSettings);
  const [savedPixelSettings, setSavedPixelSettings] = useState(initialPixelSettings);
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [enabledCount, setEnabledCount] = useState(initialEnabledCount);
  
  const [isSavingPixel, setIsSavingPixel] = useState(false);
  const [pixelSaveSuccess, setPixelSaveSuccess] = useState(false);
  const [pixelError, setPixelError] = useState<string | null>(null);
  
  const [togglingOrgId, setTogglingOrgId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);

  const supabase = createClient();

  // Check if pixel settings have changed
  const hasPixelChanges = 
    pixelSettings.enabled !== savedPixelSettings.enabled ||
    pixelSettings.pixel_id !== savedPixelSettings.pixel_id ||
    pixelSettings.access_token !== savedPixelSettings.access_token ||
    pixelSettings.test_event_code !== savedPixelSettings.test_event_code;

  // Filter organizations
  const filteredOrgs = useMemo(() => {
    let result = [...organizations];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (org) =>
          org.name.toLowerCase().includes(query) ||
          org.slug.toLowerCase().includes(query)
      );
    }

    if (showOnlyEnabled) {
      result = result.filter((org) => org.greetnow_retargeting_enabled);
    }

    return result;
  }, [organizations, searchQuery, showOnlyEnabled]);

  // Save pixel settings
  const handleSavePixelSettings = async () => {
    setIsSavingPixel(true);
    setPixelError(null);
    setPixelSaveSuccess(false);

    try {
      const { error } = await supabase
        .from("platform_settings")
        .upsert({
          key: "greetnow_facebook_pixel",
          value: pixelSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSavedPixelSettings(pixelSettings);
      setPixelSaveSuccess(true);
      setTimeout(() => setPixelSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving pixel settings:", err);
      setPixelError("Failed to save settings. Please try again.");
    } finally {
      setIsSavingPixel(false);
    }
  };

  // Toggle retargeting for an organization
  const handleToggleOrg = async (orgId: string, currentValue: boolean) => {
    setTogglingOrgId(orgId);

    try {
      const { error } = await supabase
        .from("organizations")
        .update({ greetnow_retargeting_enabled: !currentValue })
        .eq("id", orgId);

      if (error) throw error;

      // Update local state
      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === orgId
            ? { ...org, greetnow_retargeting_enabled: !currentValue }
            : org
        )
      );
      setEnabledCount((prev) => (currentValue ? prev - 1 : prev + 1));
    } catch (err) {
      console.error("Error toggling retargeting:", err);
    } finally {
      setTogglingOrgId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Target className="w-7 h-7 text-[#1877F2]" />
          B2B Retargeting Pixel
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure GreetNow&apos;s Facebook pixel to retarget B2B widget users with ads
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1877F2]/10">
              <Target className="w-5 h-5 text-[#1877F2]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pixel Status</p>
              <p className="text-lg font-semibold">
                {savedPixelSettings.enabled && savedPixelSettings.pixel_id ? (
                  <span className="text-green-500">Active</span>
                ) : (
                  <span className="text-muted-foreground">Not Configured</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Building2 className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Orgs with Retargeting</p>
              <p className="text-lg font-semibold">
                {enabledCount} / {organizations.length}
              </p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Eye className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Events Tracked</p>
              <p className="text-lg font-semibold">WidgetView, CallStarted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pixel Configuration */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Facebook Pixel Configuration</h2>
        </div>

        {/* Info box */}
        <div className="mb-6 p-4 rounded-lg bg-[#1877F2]/5 border border-[#1877F2]/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#1877F2] flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-muted-foreground">
                <strong className="text-foreground">How it works:</strong> When enabled, 
                GreetNow&apos;s pixel fires server-side via the Conversions API for B2B organizations. 
                Events tracked: <code className="px-1 py-0.5 rounded bg-muted">GreetNow_WidgetView</code> and{" "}
                <code className="px-1 py-0.5 rounded bg-muted">GreetNow_CallStarted</code> (also fires as Lead).
              </p>
              <a
                href="https://www.facebook.com/events_manager"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-[#1877F2] hover:underline"
              >
                Open Facebook Events Manager
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {pixelError && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {pixelError}
          </div>
        )}

        {pixelSaveSuccess && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            Settings saved successfully
          </div>
        )}

        <div className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div>
              <p className="font-medium">Enable Retargeting Pixel</p>
              <p className="text-sm text-muted-foreground">
                Fire events to Facebook for enabled organizations
              </p>
            </div>
            <button
              onClick={() => setPixelSettings({ ...pixelSettings, enabled: !pixelSettings.enabled })}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                pixelSettings.enabled ? "bg-[#1877F2]" : "bg-muted"
              }`}
              role="switch"
              aria-checked={pixelSettings.enabled}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  pixelSettings.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pixel ID */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Facebook Pixel ID
              </label>
              <input
                type="text"
                value={pixelSettings.pixel_id || ""}
                onChange={(e) =>
                  setPixelSettings({ ...pixelSettings, pixel_id: e.target.value || null })
                }
                placeholder="123456789012345"
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Find in Events Manager → Data Sources
              </p>
            </div>

            {/* Access Token */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Conversions API Access Token
              </label>
              <input
                type="password"
                value={pixelSettings.access_token || ""}
                onChange={(e) =>
                  setPixelSettings({ ...pixelSettings, access_token: e.target.value || null })
                }
                placeholder="••••••••••••••••"
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Events Manager → Settings → Generate Access Token
              </p>
            </div>
          </div>

          {/* Test Event Code */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Test Event Code (Optional)
            </label>
            <input
              type="text"
              value={pixelSettings.test_event_code || ""}
              onChange={(e) =>
                setPixelSettings({ ...pixelSettings, test_event_code: e.target.value || null })
              }
              placeholder="TEST12345"
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none font-mono text-sm max-w-md"
            />
            <p className="text-xs text-muted-foreground mt-1">
              For testing in Events Manager. Remove for production.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSavePixelSettings}
              disabled={!hasPixelChanges || isSavingPixel}
              className="px-4 py-2 rounded-lg bg-[#1877F2] text-white font-medium hover:bg-[#1877F2]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSavingPixel ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Pixel Settings"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Organizations List */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Organizations</h2>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOnlyEnabled}
                onChange={(e) => setShowOnlyEnabled(e.target.checked)}
                className="rounded border-border"
              />
              Show only enabled
            </label>
          </div>
        </div>

        {/* Warning if pixel not configured */}
        {!savedPixelSettings.enabled || !savedPixelSettings.pixel_id ? (
          <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-600">Pixel not configured</p>
              <p className="text-muted-foreground">
                Configure the Facebook pixel above before enabling retargeting for organizations.
              </p>
            </div>
          </div>
        ) : null}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organizations..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Organization
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                  <div className="flex items-center justify-end gap-1">
                    <Eye className="w-4 h-4" />
                    Pageviews
                  </div>
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                  <div className="flex items-center justify-end gap-1">
                    <Phone className="w-4 h-4" />
                    Calls
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                  Retargeting
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrgs.map((org) => (
                <tr key={org.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground">{org.slug}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        STATUS_COLORS[org.subscription_status]
                      }`}
                    >
                      {org.subscription_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm">{org.pageviews.toLocaleString()}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm">{org.completedCalls.toLocaleString()}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleToggleOrg(org.id, org.greetnow_retargeting_enabled)}
                        disabled={togglingOrgId === org.id || (!savedPixelSettings.enabled || !savedPixelSettings.pixel_id)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          org.greetnow_retargeting_enabled ? "bg-[#1877F2]" : "bg-muted"
                        } ${togglingOrgId === org.id ? "opacity-50" : ""} ${
                          !savedPixelSettings.enabled || !savedPixelSettings.pixel_id
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        role="switch"
                        aria-checked={org.greetnow_retargeting_enabled}
                        title={
                          !savedPixelSettings.enabled || !savedPixelSettings.pixel_id
                            ? "Configure pixel settings first"
                            : org.greetnow_retargeting_enabled
                            ? "Disable retargeting"
                            : "Enable retargeting"
                        }
                      >
                        {togglingOrgId === org.id ? (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-3 h-3 animate-spin text-white" />
                          </span>
                        ) : (
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              org.greetnow_retargeting_enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrgs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No organizations found
          </div>
        )}
      </div>
    </div>
  );
}

