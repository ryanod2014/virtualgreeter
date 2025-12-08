"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Upload, Trash2, Check, Loader2, Phone, Mail, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Organization, User } from "@ghost-greeter/domain/database.types";

interface Props {
  organization: Organization;
  user: User;
}

export function OrganizationSettingsClient({ organization: initialOrg, user: initialUser }: Props) {
  const [organization, setOrganization] = useState(initialOrg);
  const [user, setUser] = useState(initialUser);
  const [name, setName] = useState(organization.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");
  const [cobrowseEnabled, setCobrowseEnabled] = useState(organization.default_widget_settings.cobrowse_enabled ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("Changes saved successfully");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const hasOrgChanges = name !== organization.name || cobrowseEnabled !== (organization.default_widget_settings.cobrowse_enabled ?? true);
  const hasEmailChanges = email !== user.email;
  const hasPhoneChanges = phone !== (user.phone || "");
  const hasUserChanges = hasEmailChanges || hasPhoneChanges;
  const hasChanges = hasOrgChanges || hasUserChanges;

  const handleSave = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    setSuccessMessage("Changes saved successfully");

    try {
      // Update organization if name or widget settings changed
      if (hasOrgChanges) {
        const updates: Partial<Organization> = {};

        if (name !== organization.name) {
          updates.name = name.trim();
        }

        if (cobrowseEnabled !== (organization.default_widget_settings.cobrowse_enabled ?? true)) {
          updates.default_widget_settings = {
            ...organization.default_widget_settings,
            cobrowse_enabled: cobrowseEnabled,
          };
        }

        const { error: updateError } = await supabase
          .from("organizations")
          .update(updates)
          .eq("id", organization.id);

        if (updateError) throw updateError;
        setOrganization({
          ...organization,
          name: updates.name ?? organization.name,
          default_widget_settings: updates.default_widget_settings ?? organization.default_widget_settings,
        });
      }

      // Update email if changed (requires auth update + confirmation)
      if (hasEmailChanges) {
        const { error: authError } = await supabase.auth.updateUser({
          email: email.trim(),
        });

        if (authError) throw authError;

        // Also update in users table
        const { error: userEmailError } = await supabase
          .from("users")
          .update({ email: email.trim() })
          .eq("id", user.id);

        if (userEmailError) throw userEmailError;
        
        setUser({ ...user, email: email.trim() });
        setSuccessMessage("A confirmation email has been sent to your new email address");
      }

      // Update phone if changed
      if (hasPhoneChanges) {
        const { error: userUpdateError } = await supabase
          .from("users")
          .update({ phone: phone.trim() || null })
          .eq("id", user.id);

        if (userUpdateError) throw userUpdateError;
        setUser({ ...user, phone: phone.trim() || null });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, GIF, etc.)");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be less than 2MB");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Determine file extension
      const ext = file.name.split(".").pop() || "png";
      const logoPath = `${organization.id}/logo.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(logoPath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("logos")
        .getPublicUrl(logoPath);

      // Update organization with logo URL (add cache buster)
      const logoUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: logoUrl })
        .eq("id", organization.id);

      if (updateError) throw updateError;

      setOrganization({ ...organization, logo_url: logoUrl });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to upload logo: ${message}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!organization.logo_url) return;
    if (!confirm("Are you sure you want to remove the organization logo?")) return;

    setIsUploading(true);
    setError(null);

    try {
      // Remove logo URL from organization
      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: null })
        .eq("id", organization.id);

      if (updateError) throw updateError;

      setOrganization({ ...organization, logo_url: null });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Remove error:", err);
      setError("Failed to remove logo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Organization Settings</h1>
            <p className="text-muted-foreground">
              Manage your organization&apos;s profile and branding
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
          {error}
        </div>
      )}

      {/* Success Alert */}
      {saveSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 flex items-center gap-2">
          <Check className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Settings Form */}
      <div className="space-y-6">
        {/* Logo Section */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Organization Logo</h2>
          <div className="flex items-start gap-6">
            {/* Logo Preview */}
            <div className="w-24 h-24 rounded-xl bg-muted/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {organization.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt="Organization logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="w-10 h-10 text-muted-foreground" />
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-3">
              <p className="text-sm text-muted-foreground">
                Upload your organization&apos;s logo. This will be displayed in the dashboard and optionally on the widget.
              </p>
              <div className="flex gap-3">
                <label className="cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload Logo
                      </>
                    )}
                  </span>
                </label>
                {organization.logo_url && (
                  <button
                    onClick={handleRemoveLogo}
                    disabled={isUploading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: Square image, at least 200x200 pixels. Max file size: 2MB.
              </p>
            </div>
          </div>
        </div>

        {/* Basic Info Section */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            {/* Organization Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter organization name"
                className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Account Owner Section */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Account Owner</h2>
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
                />
              </div>
              {hasEmailChanges && (
                <p className="text-xs text-amber-500 mt-1">
                  Changing your email will require confirmation via a link sent to your new address
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your phone number for account-related communications
              </p>
            </div>
          </div>
        </div>

        {/* Co-Browse Settings Section */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Privacy Settings</h2>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-medium">Enable Co-Browse</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                When enabled, visitors&apos; screens are shared with agents during calls.
                When disabled, only video and audio are transmitted.
              </p>
            </div>
            <button
              onClick={() => setCobrowseEnabled(!cobrowseEnabled)}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                cobrowseEnabled ? "bg-primary" : "bg-muted"
              }`}
              role="switch"
              aria-checked={cobrowseEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  cobrowseEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <h4 className="font-medium mb-2">💡 Organization Settings</h4>
        <p className="text-sm text-muted-foreground">
          Your organization&apos;s name and logo are displayed throughout the dashboard. 
          The logo may also be shown on your embedded widgets depending on your widget configuration.
        </p>
      </div>
    </div>
  );
}

