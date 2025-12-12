"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Check,
  X,
  Palette,
  Trophy,
  DollarSign,
  ChevronDown,
  Lock,
  Facebook,
  Zap,
  Eye,
  EyeOff,
  Settings,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Disposition {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  icon: string | null;
  is_active: boolean;
  value?: number | string | null;
  display_order: number;
  fb_event_name?: string | null;
  fb_event_enabled?: boolean;
  fb_event_params?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface FacebookSettings {
  pixel_id: string | null;
  capi_access_token: string | null;
  test_event_code: string | null;
  enabled: boolean;
  pixel_base_code: string | null;
  dataset_id: string | null;
}

interface Props {
  dispositions: Disposition[];
  organizationId: string;
  facebookSettings: FacebookSettings;
}

const PRESET_COLORS = [
  { value: "#22c55e", label: "Green" },
  { value: "#ef4444", label: "Red" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#6b7280", label: "Gray" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#ec4899", label: "Pink" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#f97316", label: "Orange" },
  { value: "#06b6d4", label: "Cyan" },
];

// Facebook standard events
const FB_EVENTS = [
  { value: "", label: "None - No event" },
  { value: "Lead", label: "Lead" },
  { value: "Purchase", label: "Purchase" },
  { value: "CompleteRegistration", label: "Complete Registration" },
  { value: "Contact", label: "Contact" },
  { value: "Schedule", label: "Schedule" },
  { value: "SubmitApplication", label: "Submit Application" },
  { value: "Subscribe", label: "Subscribe" },
  { value: "StartTrial", label: "Start Trial" },
  { value: "ViewContent", label: "View Content" },
  { value: "InitiateCheckout", label: "Initiate Checkout" },
  { value: "AddToCart", label: "Add To Cart" },
];

export function DispositionsClient({
  dispositions: initialDispositions,
  organizationId,
  facebookSettings: initialFbSettings,
}: Props) {
  const [dispositions, setDispositions] = useState(initialDispositions);
  
  // Add form state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0].value);
  const [newValue, setNewValue] = useState("");
  const [newIsPrimary, setNewIsPrimary] = useState(false);
  const [newFbEvent, setNewFbEvent] = useState("");
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editFbEvent, setEditFbEvent] = useState("");

  // Facebook settings state
  const [fbSettings, setFbSettings] = useState<FacebookSettings>(initialFbSettings);
  const [savedFbSettings, setSavedFbSettings] = useState<FacebookSettings>(initialFbSettings);
  const [showFbSetup, setShowFbSetup] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [isSavingFb, setIsSavingFb] = useState(false);
  const [fbSaveSuccess, setFbSaveSuccess] = useState(false);

  const supabase = createClient();

  // Check if FB is configured (has both pixel ID and access token)
  const isFbConfigured = !!(fbSettings.pixel_id && fbSettings.capi_access_token);
  const hasFbChanges =
    fbSettings.pixel_id !== savedFbSettings.pixel_id ||
    fbSettings.capi_access_token !== savedFbSettings.capi_access_token ||
    fbSettings.test_event_code !== savedFbSettings.test_event_code;

  // Check if there are dispositions with FB events configured
  const hasDispositionsWithFbEvents = dispositions.some(d => d.fb_event_enabled && d.fb_event_name);

  // Check for incomplete FB config (has access token or FB events but no pixel ID)
  const hasIncompleteConfig = (
    (fbSettings.capi_access_token && !fbSettings.pixel_id) ||
    (hasDispositionsWithFbEvents && !savedFbSettings.pixel_id)
  );

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Save Facebook settings
  const [fbError, setFbError] = useState<string | null>(null);
  
  const handleSaveFbSettings = async () => {
    if (!hasFbChanges) return;

    setIsSavingFb(true);
    setFbError(null);

    // Validate: require pixel ID if access token is provided
    if (fbSettings.capi_access_token && !fbSettings.pixel_id) {
      setFbError("Pixel ID is required when Access Token is provided. Events cannot fire without a Pixel ID.");
      setIsSavingFb(false);
      return;
    }

    try {
      // Auto-set enabled based on whether credentials are filled
      const settingsToSave = {
        ...fbSettings,
        enabled: !!(fbSettings.pixel_id && fbSettings.capi_access_token),
      };
      
      console.log("[FB Settings] Saving:", settingsToSave);
      const { error } = await supabase
        .from("organizations")
        .update({ facebook_settings: settingsToSave })
        .eq("id", organizationId);

      if (error) {
        console.error("[FB Settings] Save error:", error);
        // Check if it's because the column doesn't exist
        if (error.code === "PGRST204" && error.message?.includes("facebook_settings")) {
          setFbError("Migration needed - run 'supabase db push' to add Facebook support");
        } else {
          setFbError(error.message);
        }
        return;
      }
      
      console.log("[FB Settings] Saved successfully");
      setFbSettings(settingsToSave); // Update local state with enabled flag
      setSavedFbSettings({...settingsToSave}); // Create new object to ensure state update
      setFbSaveSuccess(true);
      setTimeout(() => setFbSaveSuccess(false), 3000);
    } catch (err) {
      console.error("[FB Settings] Exception:", err);
      setFbError("Failed to save settings");
    } finally {
      setIsSavingFb(false);
    }
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = dispositions.findIndex((d) => d.id === active.id);
      const newIndex = dispositions.findIndex((d) => d.id === over.id);

      const reorderedDispositions = arrayMove(dispositions, oldIndex, newIndex);
      setDispositions(reorderedDispositions);

      const updates = reorderedDispositions.map((d, index) => ({
        id: d.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from("dispositions")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;

    const parsedValue = newValue ? parseFloat(newValue) : null;
    const newDisplayOrder = newIsPrimary ? 0 : Math.max(0, ...dispositions.map((d) => d.display_order)) + 1;

    console.log("[Disposition] Adding:", { name: newName, color: newColor, value: parsedValue });

    if (newIsPrimary && dispositions.length > 0) {
      const updates = dispositions.map((d, index) => ({
        id: d.id,
        display_order: index + 1,
      }));
      for (const update of updates) {
        await supabase
          .from("dispositions")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }
    }

    // Base insert data
    const insertData: Record<string, unknown> = {
      organization_id: organizationId,
      name: newName.trim(),
      color: newColor,
      value: parsedValue,
      display_order: newDisplayOrder,
      is_active: true,
    };
    
    // Only include FB fields if configured
    if (isFbConfigured || newFbEvent) {
      insertData.fb_event_name = newFbEvent || null;
      insertData.fb_event_enabled = !!newFbEvent;
    }

    let { data, error } = await supabase
      .from("dispositions")
      .insert(insertData)
      .select()
      .single();

    // If FB columns don't exist, retry without them
    if (error?.code === "PGRST204" && error.message?.includes("fb_event")) {
      console.log("[Disposition] FB columns not in DB, retrying without FB fields");
      const result = await supabase
        .from("dispositions")
        .insert({
          organization_id: organizationId,
          name: newName.trim(),
          color: newColor,
          value: parsedValue,
          display_order: newDisplayOrder,
          is_active: true,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("[Disposition] Add error:", error);
      alert(`Failed to add: ${error.message}`);
      return;
    }

    if (data) {
      console.log("[Disposition] Added successfully:", data);
      const normalizedData = {
        ...data,
        value: parsedValue ?? data.value ?? null,
        fb_event_name: newFbEvent || null,
        fb_event_enabled: !!newFbEvent,
      };
      
      if (newIsPrimary) {
        const shiftedDispositions = dispositions.map((d, index) => ({
          ...d,
          display_order: index + 1,
        }));
        setDispositions([normalizedData, ...shiftedDispositions]);
      } else {
        setDispositions([...dispositions, normalizedData]);
      }
      
      setNewName("");
      setNewColor(PRESET_COLORS[0].value);
      setNewValue("");
      setNewIsPrimary(false);
      setNewFbEvent("");
      setIsAdding(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;

    const parsedValue = editValue ? parseFloat(editValue) : null;

    console.log("[Disposition] Updating:", id, { name: editName, color: editColor, value: parsedValue, fb_event: editFbEvent });
    
    // Base update fields
    const updateData: Record<string, unknown> = { 
      name: editName.trim(), 
      color: editColor,
      value: parsedValue,
    };
    
    // Only include FB fields if FB is configured (migration has been applied)
    if (isFbConfigured || editFbEvent) {
      updateData.fb_event_name = editFbEvent || null;
      updateData.fb_event_enabled = !!editFbEvent;
    }
    
    let { error } = await supabase
      .from("dispositions")
      .update(updateData)
      .eq("id", id);

    // If FB columns don't exist, retry without them
    if (error?.code === "PGRST204" && error.message?.includes("fb_event")) {
      console.log("[Disposition] FB columns not in DB, retrying without FB fields");
      const { error: retryError } = await supabase
        .from("dispositions")
        .update({ 
          name: editName.trim(), 
          color: editColor,
          value: parsedValue,
        })
        .eq("id", id);
      error = retryError;
    }

    if (error) {
      console.error("[Disposition] Update error:", error);
      alert(`Failed to save: ${error.message}`);
      return;
    }
    
    console.log("[Disposition] Updated successfully");
    setDispositions(
      dispositions.map((d) =>
        d.id === id ? { 
          ...d, 
          name: editName.trim(), 
          color: editColor, 
          value: parsedValue,
          fb_event_name: editFbEvent || null,
          fb_event_enabled: !!editFbEvent,
        } : d
      )
    );
    setEditingId(null);
  };

  const handleMakePrimary = async (id: string) => {
    const dispositionIndex = dispositions.findIndex((d) => d.id === id);
    if (dispositionIndex <= 0) return;

    const disposition = dispositions[dispositionIndex];
    const newDispositions = [
      disposition,
      ...dispositions.slice(0, dispositionIndex),
      ...dispositions.slice(dispositionIndex + 1),
    ];

    setDispositions(newDispositions);
    setEditingId(null);

    const updates = newDispositions.map((d, index) => ({
      id: d.id,
      display_order: index,
    }));

    for (const update of updates) {
      await supabase
        .from("dispositions")
        .update({ display_order: update.display_order })
        .eq("id", update.id);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this disposition?")) return;

    const { error } = await supabase
      .from("dispositions")
      .delete()
      .eq("id", id);

    if (!error) {
      setDispositions(dispositions.filter((d) => d.id !== id));
    }
  };

  const startEditing = (disposition: Disposition) => {
    setEditingId(disposition.id);
    setEditName(disposition.name);
    setEditColor(disposition.color);
    setEditValue(disposition.value != null ? String(disposition.value) : "");
    setEditFbEvent(disposition.fb_event_name || "");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Call Dispositions</h1>
        <p className="text-muted-foreground">
          Define call outcomes and optionally fire Facebook events for tracking conversions
        </p>
      </div>

      {/* Facebook Integration Section - Collapsible */}
      <div className="glass rounded-2xl mb-6 overflow-hidden">
        <button
          onClick={() => setShowFbSetup(!showFbSetup)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isFbConfigured ? "bg-[#1877F2]/20" : "bg-muted/50"
            }`}>
              <Facebook className={`w-5 h-5 ${isFbConfigured ? "text-[#1877F2]" : "text-muted-foreground"}`} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold flex items-center gap-2">
                Facebook Pixel / Conversion API
                {isFbConfigured && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-500 font-medium">
                    Connected
                  </span>
                )}
                {hasIncompleteConfig && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Incomplete
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasIncompleteConfig
                  ? "Missing Pixel ID - events will not fire"
                  : isFbConfigured
                  ? "Fire conversion events when dispositions are selected"
                  : "Set up to track conversions in Facebook Ads"}
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showFbSetup ? "rotate-180" : ""}`} />
        </button>

        {showFbSetup && (
          <div className="p-4 pt-0 space-y-4 border-t border-border mt-0">
            {/* Quick explainer */}
            <div className="p-3 rounded-lg bg-[#1877F2]/5 border border-[#1877F2]/20 text-sm">
              <p className="text-muted-foreground">
                <strong className="text-foreground">How it works:</strong> Enter your Facebook Pixel ID and Access Token below.
                Then choose which Facebook event to fire for each disposition (Lead, Purchase, etc.).
                When an agent selects that disposition after a call, the event fires automatically.
              </p>
            </div>

            {/* Warning banner for incomplete config */}
            {hasIncompleteConfig && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-500 font-medium">Incomplete Configuration</p>
                  <p className="text-muted-foreground mt-1">
                    {hasDispositionsWithFbEvents && !savedFbSettings.pixel_id
                      ? "You have dispositions with Facebook events configured, but no Pixel ID. Events will not fire until you add a Pixel ID."
                      : "Pixel ID is required for Facebook events to fire. Add your Pixel ID to complete the setup."}
                  </p>
                </div>
              </div>
            )}

            {/* Pixel ID */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Facebook Pixel ID
              </label>
              <input
                type="text"
                value={fbSettings.pixel_id || ""}
                onChange={(e) => setFbSettings({ ...fbSettings, pixel_id: e.target.value || null })}
                placeholder="123456789012345"
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Find in Facebook Events Manager → Data Sources → Your Pixel
              </p>
            </div>

            {/* Access Token */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Conversion API Access Token
              </label>
              <div className="relative">
                <input
                  type={showAccessToken ? "text" : "password"}
                  value={fbSettings.capi_access_token || ""}
                  onChange={(e) => setFbSettings({ ...fbSettings, capi_access_token: e.target.value || null })}
                  placeholder="EAAxxxxxxxxx..."
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowAccessToken(!showAccessToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {showAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Events Manager → Settings → Generate Access Token
              </p>
            </div>

            {/* Test Event Code (optional) */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Test Event Code <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={fbSettings.test_event_code || ""}
                onChange={(e) => setFbSettings({ ...fbSettings, test_event_code: e.target.value || null })}
                placeholder="TEST12345"
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                For testing - events show in Test Events tab. Remove when going live.
              </p>
            </div>

            {/* Save button */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {fbSaveSuccess && (
                  <span className="text-sm text-green-500 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Saved
                  </span>
                )}
                {fbError && (
                  <span className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {fbError}
                  </span>
                )}
                {!fbSettings.pixel_id && !fbSettings.capi_access_token && fbSettings.enabled && !fbError && (
                  <span className="text-sm text-amber-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Enter Pixel ID and Access Token
                  </span>
                )}
              </div>
              <button
                onClick={handleSaveFbSettings}
                disabled={!hasFbChanges || isSavingFb}
                className="px-4 py-2 rounded-lg bg-[#1877F2] text-white font-medium hover:bg-[#1877F2]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSavingFb ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Facebook Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Disposition Button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Dispositions</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Disposition
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="glass rounded-2xl p-5 mb-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Name */}
            <div className="col-span-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
              <input
                type="text"
                placeholder="e.g., Qualified Lead"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none text-sm"
                autoFocus
              />
            </div>

            {/* Color */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Color</label>
              <div className="relative">
                <span 
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                  style={{ backgroundColor: newColor }}
                />
                <select
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none text-sm appearance-none cursor-pointer"
                >
                  {PRESET_COLORS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Value */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Value ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none text-sm"
              />
            </div>

            {/* FB Event */}
            <div className="col-span-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                <span className="flex items-center gap-1">
                  <Facebook className="w-3 h-3 text-[#1877F2]" />
                  Facebook Event
                </span>
              </label>
              <select
                value={newFbEvent}
                onChange={(e) => setNewFbEvent(e.target.value)}
                disabled={!isFbConfigured}
                className={`w-full px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none text-sm appearance-none cursor-pointer ${
                  !isFbConfigured ? "opacity-50" : ""
                }`}
              >
                {FB_EVENTS.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
              {!isFbConfigured && (
                <p className="text-xs text-muted-foreground mt-1">
                  Set up Facebook above first
                </p>
              )}
            </div>
          </div>

          {/* Primary toggle */}
          <div className="mt-4 flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsPrimary}
                onChange={(e) => setNewIsPrimary(e.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm">Make primary (main conversion goal)</span>
            </label>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              Add Disposition
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewName("");
                setNewValue("");
                setNewFbEvent("");
                setNewIsPrimary(false);
              }}
              className="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Dispositions List */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-border bg-muted/30">
          <div className="grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-1"></div>
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Value</div>
            <div className="col-span-3">FB Event</div>
            <div className="col-span-2">Actions</div>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={dispositions.map((d) => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="divide-y divide-border">
              {dispositions.map((disposition, index) => (
                <SortableRow
                  key={disposition.id}
                  disposition={disposition}
                  isPrimary={index === 0}
                  isEditing={editingId === disposition.id}
                  editName={editName}
                  editColor={editColor}
                  editValue={editValue}
                  editFbEvent={editFbEvent}
                  isFbConfigured={isFbConfigured}
                  onEditNameChange={setEditName}
                  onEditColorChange={setEditColor}
                  onEditValueChange={setEditValue}
                  onEditFbEventChange={setEditFbEvent}
                  onStartEditing={() => startEditing(disposition)}
                  onUpdate={() => handleUpdate(disposition.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onMakePrimary={() => handleMakePrimary(disposition.id)}
                  onDelete={() => handleDelete(disposition.id)}
                />
              ))}

              {dispositions.length === 0 && (
                <div className="p-12 text-center">
                  <Palette className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No dispositions yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create dispositions for agents to categorize call outcomes
                  </p>
                  <button
                    onClick={() => setIsAdding(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Disposition
                  </button>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Help text */}
      <div className="mt-4 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Tip:</strong> The first disposition (with the trophy) is your primary conversion goal. 
          Drag to reorder. Each disposition can fire a different Facebook event when selected.
        </p>
      </div>
    </div>
  );
}

// Sortable row component
interface SortableRowProps {
  disposition: Disposition;
  isPrimary: boolean;
  isEditing: boolean;
  editName: string;
  editColor: string;
  editValue: string;
  editFbEvent: string;
  isFbConfigured: boolean;
  onEditNameChange: (name: string) => void;
  onEditColorChange: (color: string) => void;
  onEditValueChange: (value: string) => void;
  onEditFbEventChange: (event: string) => void;
  onStartEditing: () => void;
  onUpdate: () => void;
  onCancelEdit: () => void;
  onMakePrimary: () => void;
  onDelete: () => void;
}

function SortableRow({
  disposition,
  isPrimary,
  isEditing,
  editName,
  editColor,
  editValue,
  editFbEvent,
  isFbConfigured,
  onEditNameChange,
  onEditColorChange,
  onEditValueChange,
  onEditFbEventChange,
  onStartEditing,
  onUpdate,
  onCancelEdit,
  onMakePrimary,
  onDelete,
}: SortableRowProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: disposition.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-12 gap-3 p-3 items-center ${
        isPrimary ? "bg-amber-500/5 border-l-4 border-l-amber-500" : "bg-card"
      } ${!disposition.is_active ? "opacity-50" : ""} ${
        isDragging ? "opacity-50 shadow-lg z-50" : ""
      }`}
    >
      {/* Drag Handle */}
      <div className="col-span-1">
        {isPrimary ? (
          <Lock className="w-4 h-4 text-muted-foreground/40 mx-auto" />
        ) : (
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing touch-none mx-auto block"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Name with Color */}
      <div className="col-span-4">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="p-1.5 rounded hover:bg-muted flex items-center gap-1"
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: editColor }} />
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
              
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 z-50 bg-[#1a1a2e] border border-border rounded-lg shadow-xl py-1 min-w-[140px]">
                    {!isPrimary && (
                      <button
                        onClick={() => { onMakePrimary(); setDropdownOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left"
                      >
                        <Trophy className="w-3 h-3 text-amber-500" />
                        Make primary
                      </button>
                    )}
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => { onEditColorChange(c.value); setDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left ${
                          editColor === c.value ? "bg-primary/10" : ""
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />
                        {c.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <input
              type="text"
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              className="flex-1 px-2 py-1 rounded bg-muted/50 border border-border focus:border-primary outline-none text-sm"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {isPrimary ? (
              <Trophy className="w-4 h-4 text-amber-500" />
            ) : (
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: disposition.color }} />
            )}
            <span className="font-medium text-sm">{disposition.name}</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="col-span-2">
        {isEditing ? (
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            className="w-full px-2 py-1 rounded bg-muted/50 border border-border focus:border-primary outline-none text-sm"
          />
        ) : (
          <span className="text-sm">
            {disposition.value != null ? (
              <span className="text-green-500 font-medium">
                ${Number(disposition.value).toFixed(2)}
              </span>
            ) : (
              <span className="text-muted-foreground/50">—</span>
            )}
          </span>
        )}
      </div>

      {/* FB Event */}
      <div className="col-span-3">
        {isEditing ? (
          <select
            value={editFbEvent}
            onChange={(e) => onEditFbEventChange(e.target.value)}
            disabled={!isFbConfigured}
            className={`w-full px-2 py-1 rounded bg-muted/50 border border-border focus:border-primary outline-none text-sm appearance-none cursor-pointer ${
              !isFbConfigured ? "opacity-50" : ""
            }`}
          >
            {FB_EVENTS.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        ) : (
          <span className="text-sm">
            {disposition.fb_event_enabled && disposition.fb_event_name ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1877F2]/10 text-[#1877F2] font-medium">
                <Zap className="w-3 h-3" />
                {disposition.fb_event_name}
              </span>
            ) : (
              <span className="text-muted-foreground/50">—</span>
            )}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="col-span-2 flex items-center gap-1">
        {isEditing ? (
          <>
            <button
              onClick={onUpdate}
              className="p-1.5 rounded bg-green-500/10 text-green-500 hover:bg-green-500/20"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={onCancelEdit}
              className="p-1.5 rounded bg-muted text-muted-foreground hover:bg-muted/80"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onStartEditing}
              className="px-2 py-1 rounded text-xs hover:bg-muted"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
