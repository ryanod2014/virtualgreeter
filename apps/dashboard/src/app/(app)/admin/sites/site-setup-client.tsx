"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Code, ExternalLink, Sparkles, Monitor, Smartphone, Layout, Clock, Info, RotateCcw, CheckCircle2, Loader2, TimerOff, Minimize2, Sun, Moon, Droplets, Globe, Activity } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { WidgetSettings, WidgetSize, WidgetPosition, WidgetDevices, WidgetTheme } from "@ghost-greeter/domain/database.types";

const DEFAULT_SETTINGS: WidgetSettings = {
  size: "medium",
  position: "bottom-right",
  devices: "all",
  trigger_delay: 3,
  auto_hide_delay: null,
  show_minimize_button: false,
  theme: "dark",
};

interface DetectedSite {
  domain: string;
  firstSeen: string;
  lastSeen: string;
  pageCount: number;
}

interface Props {
  organizationId: string;
  initialWidgetSettings: WidgetSettings;
  initialEmbedVerified?: boolean;
  initialVerifiedDomain?: string | null;
  detectedSites?: DetectedSite[];
}

export function SiteSetupClient({ organizationId, initialWidgetSettings, initialEmbedVerified = false, initialVerifiedDomain = null, detectedSites = [] }: Props) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [settings, setSettings] = useState<WidgetSettings>(initialWidgetSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customDelay, setCustomDelay] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customHideDelay, setCustomHideDelay] = useState<string>("");
  const [showCustomHideInput, setShowCustomHideInput] = useState(false);
  const [isVerified, setIsVerified] = useState(initialEmbedVerified);
  const [verifiedDomain, setVerifiedDomain] = useState<string | null>(initialVerifiedDomain);
  const supabase = createClient();

  // Poll for verification status every 5 seconds until verified
  useEffect(() => {
    if (isVerified) return;
    
    const checkVerification = async () => {
      const { data } = await supabase
        .from("organizations")
        .select("embed_verified_at, embed_verified_domain")
        .eq("id", organizationId)
        .single();
      
      if (data?.embed_verified_at) {
        setIsVerified(true);
        setVerifiedDomain(data.embed_verified_domain);
      }
    };
    
    // Check immediately
    checkVerification();
    
    // Then poll every 5 seconds
    const interval = setInterval(checkVerification, 5000);
    return () => clearInterval(interval);
  }, [isVerified, organizationId, supabase]);

  const presetDelays = [
    { value: 0, label: "Instantly" },
    { value: 3, label: "3 sec" },
    { value: 10, label: "10 sec" },
    { value: 30, label: "30 sec" },
  ];

  const presetHideDelays = [
    { value: null, label: "Never" },
    { value: 60, label: "1 min" },
    { value: 120, label: "2 min" },
    { value: 300, label: "5 min" },
  ];

  const isPresetDelay = presetDelays.some(d => d.value === settings.trigger_delay);
  const isPresetHideDelay = presetHideDelays.some(d => d.value === settings.auto_hide_delay);

  const handleResetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    setShowCustomInput(false);
    setCustomDelay("");
    setShowCustomHideInput(false);
    setCustomHideDelay("");
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("organizations")
      .update({ default_widget_settings: settings })
      .eq("id", organizationId);

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialWidgetSettings);

  // Get URLs from environment variables with fallbacks
  // Ensure widget URL always ends with /widget.js
  const rawWidgetUrl = process.env.NEXT_PUBLIC_WIDGET_CDN_URL || "https://cdn.ghost-greeter.com/widget.js";
  const widgetCdnUrl = rawWidgetUrl.endsWith("/widget.js") 
    ? rawWidgetUrl 
    : rawWidgetUrl.endsWith("/") 
      ? `${rawWidgetUrl}widget.js`
      : `${rawWidgetUrl}/widget.js`;
  const serverUrl = process.env.NEXT_PUBLIC_SIGNALING_SERVER || "http://localhost:3001";

  const embedCode = `<!-- Ghost-Greeter Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['GhostGreeter']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','gg','${widgetCdnUrl}'));
  gg('init', { orgId: '${organizationId}', serverUrl: '${serverUrl}' });
</script>`;

  const copyEmbedCode = async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const sizeLabels: Record<WidgetSize, { label: string; desc: string }> = {
    small: { label: "Small", desc: "Compact" },
    medium: { label: "Medium", desc: "Balanced" },
    large: { label: "Large", desc: "Bold" },
  };

  const positionLabels: Record<WidgetPosition, string> = {
    "top-left": "Top Left",
    "top-right": "Top Right",
    "center": "Center",
    "bottom-left": "Bottom Left",
    "bottom-right": "Bottom Right",
  };

  const deviceLabels: Record<WidgetDevices, { label: string; icons: React.ReactNode }> = {
    all: { label: "All Devices", icons: <><Monitor className="w-4 h-4" /><Smartphone className="w-3.5 h-3.5" /></> },
    desktop: { label: "Desktop Only", icons: <Monitor className="w-5 h-5" /> },
    mobile: { label: "Mobile Only", icons: <Smartphone className="w-5 h-5" /> },
  };

  const themeLabels: Record<WidgetTheme, { label: string; desc: string; icon: React.ReactNode }> = {
    light: { label: "Light", desc: "Bright & clean", icon: <Sun className="w-5 h-5" /> },
    dark: { label: "Dark", desc: "Sleek & modern", icon: <Moon className="w-5 h-5" /> },
    "liquid-glass": { label: "Glass", desc: "Frosted blur", icon: <Droplets className="w-5 h-5" /> },
  };

  const availableThemes: WidgetTheme[] = ["light", "dark", "liquid-glass"];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Embed Code</h1>
        <p className="text-muted-foreground">
          Configure your widget appearance and add it to your website
        </p>
      </div>

      {/* Main Embed Code Card */}
      <div className="glass rounded-2xl p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Code className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Your Widget Code</h2>
            <p className="text-sm text-muted-foreground">Works on any website</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Code Block */}
          <div className="relative">
            <pre className="p-5 rounded-xl bg-[#0d1117] text-[#c9d1d9] font-mono text-sm overflow-x-auto whitespace-pre-wrap border border-[#30363d] h-full">
              {embedCode}
            </pre>
            <button
              onClick={copyEmbedCode}
              className={`absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                copiedCode 
                  ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                  : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
              }`}
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Code
                </>
              )}
            </button>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Where to add it</h3>
            
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  1
                </div>
                <div>
                  <div className="font-medium text-sm">Copy the code</div>
                  <div className="text-xs text-muted-foreground">
                    Click the "Copy Code" button
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  2
                </div>
                <div>
                  <div className="font-medium text-sm">
                    Add to your site's header
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Use pools to control which pages show the widget
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  3
                </div>
                <div>
                  <div className="font-medium text-sm">That's it!</div>
                  <div className="text-xs text-muted-foreground">
                    Widget appears when agents are online
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Installation Status */}
      <div className="mb-6">
        {isVerified ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div>
              <span className="text-green-600 dark:text-green-400 font-medium">Widget installed successfully!</span>
              <span className="text-muted-foreground ml-1">Detected on <strong className="text-foreground">{verifiedDomain}</strong></span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin flex-shrink-0" />
            <div>
              <span className="text-amber-600 dark:text-amber-400 font-medium">Waiting for installation...</span>
              <span className="text-muted-foreground ml-1">Add the code to your site and visit a page to verify</span>
            </div>
          </div>
        )}
      </div>

      {/* Detected Sites */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Detected Sites</h2>
            <p className="text-sm text-muted-foreground">
              {detectedSites.length === 0 
                ? "No sites detected yet" 
                : `Widget detected on ${detectedSites.length} site${detectedSites.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {detectedSites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Once visitors load pages with your widget code,</p>
            <p className="text-sm">the detected sites will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {detectedSites.map((site) => {
              const lastSeenDate = new Date(site.lastSeen);
              const isRecent = Date.now() - lastSeenDate.getTime() < 24 * 60 * 60 * 1000; // Last 24h
              
              return (
                <div
                  key={site.domain}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isRecent ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                    <div className="min-w-0">
                      <a
                        href={site.domain}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm hover:text-primary transition-colors flex items-center gap-1.5 truncate"
                      >
                        {site.domain.replace(/^https?:\/\//, '')}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
                      </a>
                      <div className="text-xs text-muted-foreground">
                        {site.pageCount.toLocaleString()} pageview{site.pageCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 justify-end">
                      <Activity className="w-3 h-3" />
                      {isRecent ? (
                        <span className="text-green-600 dark:text-green-400">Active today</span>
                      ) : (
                        <span>Last: {lastSeenDate.toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Widget Settings Section */}
      <div className="glass rounded-2xl p-8 mb-6">
        {/* Header with default badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Layout className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Widget Settings</h2>
                <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">
                  Default
                </span>
              </div>
              <p className="text-sm text-muted-foreground">These settings apply to all pages on your site</p>
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={!hasChanges || saving}
            className={`px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              hasChanges
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>

        {/* Preview Panel - Above Settings */}
        <div className="mb-8">
          <div className="max-w-xl">
            <div className="flex items-center mb-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                Preview
                <span className="text-muted-foreground font-normal">Desktop & Mobile</span>
              </label>
            </div>
            <WidgetPreview settings={settings} />
          </div>
        </div>

        {/* Info callout */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 mb-6 max-w-xl">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-medium text-blue-600 dark:text-blue-400">These are your default settings.</span>
            <span className="text-muted-foreground"> Want different settings for specific pages? You can override these per-URL in </span>
            <Link href="/admin/pools" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Pools → Widget Appearance
            </Link>
          </div>
        </div>

        <div className="space-y-6 max-w-md">
          {/* Size */}
          <div>
            <label className="block text-sm font-medium mb-3">Size</label>
            <div className="grid grid-cols-3 gap-2">
              {(["small", "medium", "large"] as WidgetSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setSettings({ ...settings, size })}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    settings.size === size
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    <div 
                      className="bg-primary/60 rounded"
                      style={{
                        width: size === "small" ? 16 : size === "medium" ? 22 : 28,
                        height: size === "small" ? 22 : size === "medium" ? 28 : 34,
                      }}
                    />
                  </div>
                  <div className="text-xs font-medium">{sizeLabels[size].label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium mb-3">Position</label>
            <div className="grid grid-cols-3 gap-2">
              {(["top-left", "top-right", "center", "bottom-left", "bottom-right"] as WidgetPosition[]).map((pos) => {
                const alignMap: Record<WidgetPosition, string> = {
                  "top-left": "items-start justify-start",
                  "top-right": "items-start justify-end",
                  "center": "items-center justify-center",
                  "bottom-left": "items-end justify-start",
                  "bottom-right": "items-end justify-end",
                };
                return (
                  <button
                    key={pos}
                    onClick={() => setSettings({ ...settings, position: pos })}
                    className={`p-2 rounded-xl border-2 transition-all ${
                      settings.position === pos
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`flex ${alignMap[pos]} h-8 bg-muted/30 rounded border border-dashed border-muted-foreground/30 p-1`}>
                      <div className="w-2.5 h-2.5 bg-primary rounded-sm" />
                    </div>
                    <div className="text-[10px] font-medium mt-1">{positionLabels[pos]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Devices */}
          <div>
            <label className="block text-sm font-medium mb-3">Show On</label>
            <div className="grid grid-cols-3 gap-2">
              {(["all", "desktop", "mobile"] as WidgetDevices[]).map((device) => (
                <button
                  key={device}
                  onClick={() => setSettings({ ...settings, devices: device })}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    settings.devices === device
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex justify-center items-center gap-1 mb-1.5 h-5 text-muted-foreground">
                    {deviceLabels[device].icons}
                  </div>
                  <div className="text-xs font-medium">{deviceLabels[device].label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium mb-3">Theme</label>
            <div className={`grid gap-2 ${availableThemes.length > 3 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {availableThemes.map((theme) => (
                <button
                  key={theme}
                  onClick={() => setSettings({ ...settings, theme })}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    settings.theme === theme
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  } ${theme === "liquid-glass" ? "bg-gradient-to-br from-indigo-500/10 to-purple-500/10" : ""}`}
                >
                  <div className="flex justify-center items-center mb-1.5 h-5 text-muted-foreground">
                    {themeLabels[theme].icon}
                  </div>
                  <div className="text-xs font-medium">{themeLabels[theme].label}</div>
                  <div className="text-[10px] text-muted-foreground">{themeLabels[theme].desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Trigger Delay - Buttons */}
          <div>
            <label className="block text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Show After
            </label>
            <div className="flex flex-wrap gap-2">
              {presetDelays.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    setSettings({ ...settings, trigger_delay: preset.value });
                    setShowCustomInput(false);
                    setCustomDelay("");
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    settings.trigger_delay === preset.value && !showCustomInput
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setShowCustomInput(true);
                  setCustomDelay(isPresetDelay ? "" : String(settings.trigger_delay));
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  showCustomInput || (!isPresetDelay && settings.trigger_delay > 0)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                Other
              </button>
            </div>
            {(showCustomInput || (!isPresetDelay && settings.trigger_delay > 0)) && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={customDelay}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomDelay(val);
                    if (val && !isNaN(parseInt(val))) {
                      setSettings({ ...settings, trigger_delay: parseInt(val) });
                    }
                  }}
                  placeholder="0"
                  className="w-32 px-3 py-2 rounded-lg bg-muted border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                />
                <span className="text-sm text-muted-foreground">seconds</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {settings.trigger_delay === 0 
                ? "Widget appears immediately when page loads" 
                : `Widget appears ${settings.trigger_delay} second${settings.trigger_delay > 1 ? 's' : ''} after page loads`}
            </p>
          </div>

          {/* Auto-Hide Delay - Buttons */}
          <div>
            <label className="block text-sm font-medium mb-3 flex items-center gap-2">
              <TimerOff className="w-4 h-4 text-muted-foreground" />
              Disappear After
            </label>
            <div className="flex flex-wrap gap-2">
              {presetHideDelays.map((preset) => (
                <button
                  key={preset.value ?? "never"}
                  onClick={() => {
                    setSettings({ ...settings, auto_hide_delay: preset.value });
                    setShowCustomHideInput(false);
                    setCustomHideDelay("");
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    settings.auto_hide_delay === preset.value && !showCustomHideInput
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setShowCustomHideInput(true);
                  setCustomHideDelay(isPresetHideDelay || settings.auto_hide_delay === null ? "" : String(Math.floor(settings.auto_hide_delay / 60)));
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  showCustomHideInput || (!isPresetHideDelay && settings.auto_hide_delay !== null)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                Custom
              </button>
            </div>
            {(showCustomHideInput || (!isPresetHideDelay && settings.auto_hide_delay !== null)) && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={customHideDelay}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomHideDelay(val);
                    if (val && !isNaN(parseInt(val))) {
                      setSettings({ ...settings, auto_hide_delay: parseInt(val) * 60 });
                    }
                  }}
                  placeholder="0"
                  className="w-32 px-3 py-2 rounded-lg bg-muted border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {settings.auto_hide_delay === null 
                ? "Widget stays visible until visitor interacts or leaves" 
                : `Widget hides after ${Math.floor(settings.auto_hide_delay / 60)} minute${Math.floor(settings.auto_hide_delay / 60) !== 1 ? 's' : ''} of no interaction`}
            </p>
          </div>

          {/* Minimize Button Toggle */}
          <div>
            <label className="block text-sm font-medium mb-3 flex items-center gap-2">
              <Minimize2 className="w-4 h-4 text-muted-foreground" />
              Allow user to minimize
            </label>
            <button
              onClick={() => setSettings({ ...settings, show_minimize_button: !settings.show_minimize_button })}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all w-full ${
                settings.show_minimize_button
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className={`w-10 h-6 rounded-full transition-colors relative ${
                settings.show_minimize_button ? "bg-primary" : "bg-muted"
              }`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  settings.show_minimize_button ? "translate-x-5" : "translate-x-1"
                }`} />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">
                  {settings.show_minimize_button ? "Enabled" : "Disabled"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {settings.show_minimize_button 
                    ? "Visitors can minimize the widget" 
                    : "Widget cannot be minimized"}
                </div>
              </div>
            </button>
          </div>

          {/* Reset to Defaults Button */}
          <div className="pt-4 border-t border-border">
            <button
              onClick={handleResetToDefaults}
              disabled={JSON.stringify(settings) === JSON.stringify(DEFAULT_SETTINGS)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default Settings
            </button>
          </div>
        </div>

      </div>

      {/* Routing CTA */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Want different agents on different pages?</h3>
              <p className="text-sm text-muted-foreground">
                Use Agent Pools to show your sales team on pricing pages, support on help pages, etc.
              </p>
            </div>
          </div>
          <Link
            href="/admin/pools"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
          >
            Configure Pools
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// Widget Preview Component
function WidgetPreview({ settings }: { settings: WidgetSettings }) {
  // Scaled sizes that fit within the preview - max ~40% of container height
  const sizeConfig: Record<WidgetSize, { desktop: { w: number; h: number }; mobile: { w: number; h: number } }> = {
    small: { desktop: { w: 48, h: 64 }, mobile: { w: 28, h: 36 } },
    medium: { desktop: { w: 64, h: 80 }, mobile: { w: 36, h: 44 } },
    large: { desktop: { w: 80, h: 96 }, mobile: { w: 44, h: 52 } },
  };

  const positionClasses: Record<WidgetPosition, string> = {
    "top-left": "top-2 left-2",
    "top-right": "top-2 right-2",
    "center": "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
    "bottom-left": "bottom-2 left-2",
    "bottom-right": "bottom-2 right-2",
  };

  const sizes = sizeConfig[settings.size];

  // Desktop preview height (aspect-video = 56.25% of width, roughly 180px at full width)
  const previewHeight = 180;

  // Theme-based widget colors
  const isLightTheme = settings.theme === "light";
  const isLiquidGlass = settings.theme === "liquid-glass";
  
  const widgetBg = isLiquidGlass
    ? "bg-gradient-to-br from-white/20 via-white/10 to-white/5 backdrop-blur-md border border-white/30"
    : isLightTheme 
      ? "bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-200" 
      : "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950";
  const widgetVideoArea = isLiquidGlass
    ? "bg-gradient-to-b from-white/20 to-white/5"
    : isLightTheme
      ? "bg-gradient-to-b from-gray-100 to-gray-200"
      : "bg-gradient-to-b from-white/30 to-white/10";
  const widgetControlArea = isLiquidGlass
    ? "bg-white/10"
    : isLightTheme
      ? "bg-gray-100"
      : "bg-black/20";
  const widgetAvatarRing = isLiquidGlass
    ? "bg-white/30 border border-white/50"
    : isLightTheme
      ? "bg-gray-300 border border-gray-400"
      : "bg-white/40 border border-white/60";

  return (
    <div className="flex gap-6">
      {/* Desktop Preview */}
      <div className={settings.devices === "mobile" ? "opacity-30" : ""}>
        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <Monitor className="w-3 h-3" />
          Desktop
          {settings.devices === "mobile" && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Hidden</span>}
        </div>
        <div 
          className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden border border-border"
          style={{ height: previewHeight, width: previewHeight * (16/9) }}
        >
          {/* Browser chrome */}
          <div className="absolute top-0 left-0 right-0 h-5 bg-slate-700/50 flex items-center px-2 gap-1">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/70" />
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/70" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/70" />
            </div>
          </div>
          
          {/* Page content */}
          <div className="absolute top-7 left-3 right-3 bottom-3">
            <div className="space-y-1.5">
              <div className="h-2 bg-white/10 rounded w-1/3" />
              <div className="h-1.5 bg-white/5 rounded w-2/3" />
              <div className="h-1.5 bg-white/5 rounded w-1/2" />
            </div>
          </div>

          {/* Widget */}
          {settings.devices !== "mobile" && (
            <div className={`absolute ${positionClasses[settings.position]} transition-all duration-300`}>
              <div 
                className={`${widgetBg} rounded-lg shadow-lg overflow-hidden transition-all duration-300`}
                style={{ width: sizes.desktop.w, height: sizes.desktop.h }}
              >
                <div className={`h-2/3 ${widgetVideoArea} flex items-center justify-center`}>
                  <div className={`w-6 h-6 rounded-full ${widgetAvatarRing}`} />
                </div>
                <div className={`h-1/3 ${widgetControlArea} flex items-center justify-center gap-1`}>
                  <div className={`w-3 h-3 rounded-full ${isLiquidGlass ? "bg-white/30" : isLightTheme ? "bg-gray-400" : "bg-white/20"}`} />
                  <div className={`w-3 h-3 rounded-full ${isLiquidGlass ? "bg-white/30" : isLightTheme ? "bg-gray-400" : "bg-white/20"}`} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Preview - Same height as desktop */}
      <div className={settings.devices === "desktop" ? "opacity-30" : ""}>
        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <Smartphone className="w-3 h-3" />
          Mobile
          {settings.devices === "desktop" && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Hidden</span>}
        </div>
        <div style={{ height: previewHeight }}>
          <div 
            className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden border-2 border-slate-600"
            style={{ height: previewHeight, width: previewHeight * (9/19) }}
          >
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-2.5 bg-slate-900 rounded-b-lg" />
            
            {/* Page content */}
            <div className="absolute top-6 left-2 right-2 bottom-4">
              <div className="space-y-1">
                <div className="h-1 bg-white/10 rounded w-2/3" />
                <div className="h-0.5 bg-white/5 rounded w-full" />
                <div className="h-0.5 bg-white/5 rounded w-3/4" />
              </div>
            </div>

            {/* Widget */}
            {settings.devices !== "desktop" && (
              <div className={`absolute ${positionClasses[settings.position]} transition-all duration-300`}>
                <div 
                  className={`${widgetBg} rounded shadow-lg overflow-hidden transition-all duration-300`}
                  style={{ width: sizes.mobile.w, height: sizes.mobile.h }}
                >
                  <div className={`h-2/3 ${widgetVideoArea} flex items-center justify-center`}>
                    <div className={`w-3 h-3 rounded-full ${widgetAvatarRing}`} />
                  </div>
                  <div className={`h-1/3 ${widgetControlArea}`} />
                </div>
              </div>
            )}

            {/* Home indicator */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
