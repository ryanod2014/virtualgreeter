"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Trash2,
  Globe,
  ChevronDown,
  ChevronRight,
  Layers,
  UserPlus,
  X,
  Route,
  Filter,
  Pencil,
  MessageSquare,
  Check,
  Video,
  Upload,
  Loader2,
  Play,
  Square,
  Camera,
  Library,
  Layout,
  Monitor,
  Smartphone,
  Clock,
  TimerOff,
  Minimize2,
  Sun,
  Moon,
  Droplets,
} from "lucide-react";
import type { WidgetSettings, WidgetSize, WidgetPosition, WidgetDevices, WidgetTheme } from "@ghost-greeter/domain/database.types";
import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Signaling server URL for syncing config
const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER ?? "http://localhost:3001";

// ============================================================================
// TYPES
// ============================================================================

type RuleMatchType = "is_exactly" | "contains" | "does_not_contain" | "starts_with" | "ends_with";
type RuleConditionType = "domain" | "path" | "query_param";

interface RuleCondition {
  type: RuleConditionType;
  matchType: RuleMatchType;
  value: string;
  paramName?: string; // For query_param type
}

interface RoutingRule {
  id: string;
  pool_id: string;
  name: string | null;
  domain_pattern: string;
  path_pattern: string;
  conditions: RuleCondition[];
  priority: number;
  is_active: boolean;
}

interface Agent {
  id: string;
  display_name: string;
}

interface PoolMember {
  id: string;
  agent_profile_id: string;
  agent_profiles: Agent;
}

interface Pool {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  intro_script: string;
  example_wave_video_url: string | null;
  example_intro_video_url: string | null;
  example_loop_video_url: string | null;
  is_default: boolean;
  is_catch_all: boolean;
  widget_settings: WidgetSettings | null;
  pool_routing_rules: RoutingRule[];
  agent_pool_members: PoolMember[];
}

interface PathWithVisitors {
  path: string;
  visitorCount: number;
}

interface DefaultVideos {
  wave: string | null;
  intro: string | null;
  loop: string | null;
}

interface Props {
  pools: Pool[];
  agents: Agent[];
  organizationId: string;
  pathsWithVisitors: PathWithVisitors[];
  defaultVideos: DefaultVideos;
  orgDefaultWidgetSettings: WidgetSettings;
}

// ============================================================================
// RULE CONDITION BUILDER COMPONENT
// ============================================================================

interface RuleConditionRowProps {
  condition: RuleCondition;
  index: number;
  onUpdate: (index: number, condition: RuleCondition) => void;
  onRemove: (index: number) => void;
  isOnly: boolean;
}

function RuleConditionRow({ condition, index, onUpdate, onRemove, isOnly }: RuleConditionRowProps) {
  const matchTypeLabels: Record<RuleMatchType, string> = {
    is_exactly: "is exactly",
    contains: "contains",
    does_not_contain: "does not contain",
    starts_with: "starts with",
    ends_with: "ends with",
  };

  const getPlaceholder = () => {
    switch (condition.type) {
      case "domain": return "example.com";
      case "path": return "/pricing";
      case "query_param": return "google";
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/50 group flex-wrap">
      {/* AND label for non-first conditions */}
      {index > 0 && (
        <span className="text-xs font-semibold text-primary/70 bg-primary/10 px-2 py-0.5 rounded uppercase tracking-wider">
          AND
        </span>
      )}
      
      {/* Type selector */}
      <select
        value={condition.type}
        onChange={(e) => {
          const newType = e.target.value as RuleConditionType;
          onUpdate(index, { 
            ...condition, 
            type: newType,
            paramName: newType === "query_param" ? (condition.paramName || "utm_source") : undefined
          });
        }}
        className="px-3 py-2 rounded-lg bg-background border border-border text-sm font-medium focus:border-primary outline-none cursor-pointer"
      >
        <option value="domain">Domain</option>
        <option value="path">Path</option>
        <option value="query_param">Query Param</option>
      </select>

      {/* Parameter name input for query_param type */}
      {condition.type === "query_param" && (
        <input
          type="text"
          value={condition.paramName || ""}
          onChange={(e) => onUpdate(index, { ...condition, paramName: e.target.value })}
          placeholder="utm_source"
          className="w-28 px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono focus:border-primary outline-none"
        />
      )}

      {/* Match type selector */}
      <select
        value={condition.matchType}
        onChange={(e) => onUpdate(index, { ...condition, matchType: e.target.value as RuleMatchType })}
        className="px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary outline-none cursor-pointer"
      >
        {Object.entries(matchTypeLabels).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {/* Value input */}
      <input
        type="text"
        value={condition.value}
        onChange={(e) => onUpdate(index, { ...condition, value: e.target.value })}
        placeholder={getPlaceholder()}
        className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono focus:border-primary outline-none min-w-[140px]"
      />

      {/* Remove button */}
      {!isOnly && (
        <button
          onClick={() => onRemove(index)}
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
          title="Remove condition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// RULE BUILDER COMPONENT
// ============================================================================

interface RuleBuilderProps {
  poolName: string;
  onSave: (conditions: RuleCondition[], ruleName: string) => void;
  onCancel: () => void;
  existingRule?: RoutingRule; // For editing
}

function RuleBuilder({ poolName, onSave, onCancel, existingRule }: RuleBuilderProps) {
  // Simple list of AND conditions for a single rule
  const [conditions, setConditions] = useState<RuleCondition[]>(() => {
    if (existingRule?.conditions && existingRule.conditions.length > 0) {
      return existingRule.conditions;
    }
    // Fallback to legacy patterns if no conditions
    if (existingRule) {
      const legacyConditions: RuleCondition[] = [];
      if (existingRule.domain_pattern && existingRule.domain_pattern !== "*") {
        legacyConditions.push({ type: "domain", matchType: "contains", value: existingRule.domain_pattern });
      }
      if (existingRule.path_pattern && existingRule.path_pattern !== "*") {
        legacyConditions.push({ type: "path", matchType: "contains", value: existingRule.path_pattern });
      }
      if (legacyConditions.length > 0) return legacyConditions;
    }
    return [{ type: "domain", matchType: "contains", value: "" }];
  });
  const [ruleName, setRuleName] = useState(existingRule?.name || "");
  
  const isEditing = !!existingRule;

  const addCondition = () => {
    setConditions([...conditions, { type: "path", matchType: "contains", value: "" }]);
  };

  const updateCondition = (index: number, condition: RuleCondition) => {
    const newConditions = [...conditions];
    newConditions[index] = condition;
    setConditions(newConditions);
  };

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  const hasValidConditions = conditions.some(c => c.value.trim() !== "" || (c.type === "query_param" && c.paramName?.trim()));

  // Generate preview text
  const generatePreview = () => {
    const validConditions = conditions.filter(c => c.value.trim() !== "");
    
    if (validConditions.length === 0) return "All traffic (no conditions set)";

    const matchTypeLabels: Record<RuleMatchType, string> = {
      is_exactly: "=",
      contains: "contains",
      does_not_contain: "excludes",
      starts_with: "starts with",
      ends_with: "ends with",
    };

    return validConditions.map((c, i) => {
      const prefix = i > 0 ? " AND " : "";
      const typeLabel = c.type === "query_param" ? `?${c.paramName}` : c.type;
      return `${prefix}${typeLabel} ${matchTypeLabels[c.matchType]} "${c.value}"`;
    }).join("");
  };

  return (
    <div className="bg-gradient-to-b from-primary/5 to-transparent border-2 border-primary/20 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEditing ? 'bg-amber-500/20' : 'bg-primary/20'}`}>
          {isEditing ? <Pencil className="w-5 h-5 text-amber-500" /> : <Filter className="w-5 h-5 text-primary" />}
        </div>
        <div>
          <h4 className="font-semibold text-lg">{isEditing ? 'Edit Routing Rule' : 'Create Routing Rule'}</h4>
          <p className="text-sm text-muted-foreground">Define when visitors should be routed to this pool</p>
        </div>
      </div>

      {/* Rule Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-muted-foreground">
          Rule Name (optional)
        </label>
        <input
          type="text"
          value={ruleName}
          onChange={(e) => setRuleName(e.target.value)}
          placeholder="e.g., Pricing page visitors, Enterprise customers..."
          className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none"
        />
      </div>

      {/* Conditions */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3 text-muted-foreground">
          Conditions <span className="text-xs font-normal">(all must match)</span>
        </label>
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <RuleConditionRow
              key={index}
              condition={condition}
              index={index}
              onUpdate={updateCondition}
              onRemove={removeCondition}
              isOnly={conditions.length === 1}
            />
          ))}
        </div>
        
        {/* Add AND condition button */}
        <button
          onClick={addCondition}
          className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add condition (AND)
        </button>
      </div>

      {/* Preview */}
      <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
          <Route className="w-4 h-4" />
          <span className="text-sm font-semibold">Rule Preview</span>
        </div>
        <p className="text-sm">
          Route to <span className="font-semibold text-primary">"{poolName}"</span> when:
        </p>
        <code className="block mt-2 text-sm bg-background/50 rounded-lg px-3 py-2 font-mono">
          {generatePreview()}
        </code>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            const filteredConditions = conditions.filter(c => c.value.trim() !== "" || (c.type === "query_param" && c.paramName?.trim()));
            onSave(filteredConditions, ruleName);
          }}
          disabled={!hasValidConditions}
          className={`flex-1 px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            isEditing 
              ? 'bg-amber-500 text-white hover:bg-amber-600' 
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {isEditing ? 'Update Rule' : 'Save Rule'}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// RULE DISPLAY COMPONENT
// ============================================================================

interface RuleDisplayProps {
  rule: RoutingRule;
  onDelete: () => void;
  onEdit: () => void;
}

function RuleDisplay({ rule, onDelete, onEdit }: RuleDisplayProps) {
  const matchTypeLabels: Record<RuleMatchType, string> = {
    is_exactly: "is exactly",
    contains: "contains",
    does_not_contain: "doesn't contain",
    starts_with: "starts with",
    ends_with: "ends with",
  };

  const matchTypeColors: Record<RuleMatchType, string> = {
    is_exactly: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    contains: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    does_not_contain: "bg-red-500/10 text-red-500 border-red-500/20",
    starts_with: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    ends_with: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  };

  const getTypeColor = (type: RuleConditionType) => {
    switch (type) {
      case "domain": return "bg-violet-500/10 text-violet-500 border-violet-500/20";
      case "path": return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
      case "query_param": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    }
  };

  const getTypeLabel = (condition: RuleCondition) => {
    if (condition.type === "query_param") {
      return `?${condition.paramName || "param"}`;
    }
    return condition.type;
  };

  // Get conditions from rule
  const conditions = rule.conditions && rule.conditions.length > 0 ? rule.conditions : [];

  // Fallback to legacy patterns if no conditions
  const hasLegacyPatterns = conditions.length === 0 && 
    (rule.domain_pattern !== "*" || rule.path_pattern !== "*");

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 group hover:border-border transition-colors">
      <div className="flex-1">
        {/* Rule name if present */}
        {rule.name && (
          <div className="text-sm font-medium mb-2">{rule.name}</div>
        )}
        
        {/* Conditions display */}
        <div className="flex flex-wrap items-center gap-2">
          {conditions.length > 0 ? (
            conditions.map((condition, idx) => (
              <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                {idx > 0 && (
                  <span className="text-xs font-semibold text-muted-foreground px-1">AND</span>
                )}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${getTypeColor(condition.type)}`}>
                  {condition.type === "domain" ? <Globe className="w-3 h-3" /> : <Route className="w-3 h-3" />}
                  {getTypeLabel(condition)}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-lg border text-xs font-semibold ${matchTypeColors[condition.matchType]}`}>
                  {matchTypeLabels[condition.matchType]}
                </span>
                <code className="px-2 py-1 rounded-lg bg-background text-xs font-mono border border-border">
                  {condition.value}
                </code>
              </div>
            ))
          ) : hasLegacyPatterns ? (
            // Legacy display for old rules
            <>
              {rule.domain_pattern !== "*" && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20 text-xs font-medium">
                    <Globe className="w-3 h-3" />
                    domain
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-semibold">
                    contains
                  </span>
                  <code className="px-2 py-1 rounded-lg bg-background text-xs font-mono border border-border">
                    {rule.domain_pattern}
                  </code>
                </div>
              )}
              {rule.path_pattern !== "*" && (
                <div className="flex items-center gap-1.5">
                  {rule.domain_pattern !== "*" && (
                    <span className="text-xs font-semibold text-muted-foreground px-1">AND</span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 text-xs font-medium">
                    <Route className="w-3 h-3" />
                    path
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-semibold">
                    contains
                  </span>
                  <code className="px-2 py-1 rounded-lg bg-background text-xs font-mono border border-border">
                    {rule.path_pattern}
                  </code>
                </div>
              )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">All traffic</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all ml-4">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
          title="Edit rule"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Delete rule"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// VIDEO RECORDER MODAL COMPONENT
// ============================================================================

interface VideoRecorderModalProps {
  isOpen: boolean;
  type: "wave" | "intro" | "loop";
  script?: string;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

function VideoRecorderModal({ isOpen, type, script, onSave, onClose }: VideoRecorderModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const typeLabels = {
    wave: "Wave Video",
    intro: "Intro Video", 
    loop: "Loop Video"
  };

  const typeDescriptions = {
    wave: "Wave and look engaged - this grabs attention",
    intro: "Read the script naturally - plays with audio",
    loop: "Smile and wait patiently - this loops"
  };

  // Initialize camera when modal opens
  useEffect(() => {
    if (!isOpen) return;

    navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: "user" },
      audio: true,
    }).then(stream => {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    }).catch(err => {
      console.error("Camera access denied:", err);
    });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setHasPermission(false);
      setRecordedBlob(null);
      setIsRecording(false);
    };
  }, [isOpen]);

  const startRecording = () => {
    setCountdown(3);
    let count = 3;
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(interval);
        setCountdown(null);
        beginRecording();
      }
    }, 1000);
  };

  const beginRecording = () => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=vp9",
    });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
    };
    
    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
  };

  const handleSave = () => {
    if (recordedBlob) {
      onSave(recordedBlob);
    }
  };

  const handleRetry = () => {
    setRecordedBlob(null);
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Record {typeLabels[type]}</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-muted-foreground mb-4">{typeDescriptions[type]}</p>

        {/* Script display for intro */}
        {type === "intro" && script && (
          <div className="mb-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div className="text-xs text-primary font-medium mb-1">Read this script:</div>
            <p className="text-lg">"{script}"</p>
          </div>
        )}

        {/* Video preview */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-4">
          {recordedBlob ? (
            <video
              src={URL.createObjectURL(recordedBlob)}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
          )}
          
          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-7xl font-bold text-white animate-pulse">{countdown}</span>
            </div>
          )}
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500 text-white">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              REC
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {!recordedBlob ? (
            <>
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={!hasPermission || countdown !== null}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  <Camera className="w-5 h-5" />
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600"
                >
                  <Square className="w-5 h-5" />
                  Stop Recording
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border hover:bg-muted"
              >
                Retry
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90"
              >
                <Check className="w-5 h-5" />
                Save Video
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// POOL WIDGET SETTINGS COMPONENT
// ============================================================================

interface PoolWidgetSettingsProps {
  pool: Pool;
  orgDefaults: WidgetSettings;
  onUpdate: (settings: WidgetSettings | null) => void;
}

function PoolWidgetSettings({ pool, orgDefaults, onUpdate }: PoolWidgetSettingsProps) {
  const [useCustom, setUseCustom] = useState(pool.widget_settings !== null);
  const [settings, setSettings] = useState<WidgetSettings>(pool.widget_settings ?? orgDefaults);
  const [saving, setSaving] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDelay, setCustomDelay] = useState<string>("");
  const [showCustomHideInput, setShowCustomHideInput] = useState(false);
  const [customHideDelay, setCustomHideDelay] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(pool.widget_settings === null); // Collapsed if already has custom settings
  const supabase = createClient();

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

  const handleToggleCustom = async (custom: boolean) => {
    setUseCustom(custom);
    
    if (!custom) {
      // Reset to org defaults
      setSaving(true);
      const { error } = await supabase
        .from("agent_pools")
        .update({ widget_settings: null })
        .eq("id", pool.id);
      
      if (!error) {
        onUpdate(null);
        setSettings(orgDefaults);
      }
      setSaving(false);
    } else {
      // Enable custom settings with current org defaults as starting point
      setSettings(orgDefaults);
    }
  };

  const handleSaveCustomSettings = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("agent_pools")
      .update({ widget_settings: settings })
      .eq("id", pool.id);
    
    if (!error) {
      onUpdate(settings);
      setIsExpanded(false); // Collapse after saving
    }
    setSaving(false);
  };

  const sizeLabels: Record<WidgetSize, string> = {
    small: "Small",
    medium: "Medium",
    large: "Large",
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

  const hasChanges = useCustom && JSON.stringify(settings) !== JSON.stringify(pool.widget_settings);

  return (
    <div className="p-6 border-b border-border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold flex items-center gap-2">
            <Layout className="w-4 h-4 text-primary" />
            Widget Appearance
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Override default widget settings for pages matching this pool's rules
          </p>
        </div>
        {useCustom && (
          <button
            onClick={handleSaveCustomSettings}
            disabled={!hasChanges || saving}
            className={`px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              hasChanges
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        )}
      </div>

      {/* Toggle between org defaults and custom */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => handleToggleCustom(false)}
          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
            !useCustom
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            {!useCustom && <Check className="w-4 h-4 text-primary" />}
            <span className="font-medium">Use Default Settings</span>
          </div>
          <p className="text-xs text-muted-foreground">Your account wide default</p>
        </button>
        
        <button
          onClick={() => {
            if (!useCustom) {
              handleToggleCustom(true);
              setIsExpanded(true);
            } else {
              setIsExpanded(!isExpanded);
            }
          }}
          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
            useCustom
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            {useCustom && <Check className="w-4 h-4 text-primary" />}
            <span className="font-medium">Custom for This Pool</span>
            {useCustom && (
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {useCustom && !isExpanded 
              ? `${settings.size} · ${positionLabels[settings.position]} · ${settings.trigger_delay === 0 ? "instant" : `${settings.trigger_delay}s delay`}`
              : "Different settings for these pages"
            }
          </p>
        </button>
      </div>

      {/* Custom settings editor */}
      {useCustom && isExpanded && (
        <div className="space-y-6">
          {/* Preview Panel */}
          <div className="max-w-xl">
            <div className="flex items-center mb-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                Preview
                <span className="text-muted-foreground font-normal">Desktop & Mobile</span>
              </label>
            </div>
            <PoolWidgetPreview settings={settings} />
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
                  <div className="text-xs font-medium">{sizeLabels[size]}</div>
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
          </div>
        </div>
      )}
    </div>
  );
}

// Pool Widget Preview Component
function PoolWidgetPreview({ settings }: { settings: WidgetSettings }) {
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

      {/* Mobile Preview */}
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

// ============================================================================
// MAIN POOLS CLIENT COMPONENT
// ============================================================================

export function PoolsClient({ 
  pools: initialPools, 
  agents,
  organizationId,
  defaultVideos,
  orgDefaultWidgetSettings,
}: Props) {
  const [pools, setPools] = useState(initialPools);
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set([initialPools[0]?.id]));
  const [isAddingPool, setIsAddingPool] = useState(false);
  const [newPoolName, setNewPoolName] = useState("");
  const [newPoolDescription, setNewPoolDescription] = useState("");
  const [addingRuleToPool, setAddingRuleToPool] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<{ poolId: string; rule: RoutingRule } | null>(null);
  const [addingAgentToPool, setAddingAgentToPool] = useState<string | null>(null);
  const [editingScriptPoolId, setEditingScriptPoolId] = useState<string | null>(null);
  const [editingScriptText, setEditingScriptText] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState<{ poolId: string; type: "wave" | "intro" | "loop" } | null>(null);
  const [recordingVideo, setRecordingVideo] = useState<{ poolId: string; type: "wave" | "intro" | "loop" } | null>(null);

  const waveInputRef = useRef<HTMLInputElement>(null);
  const loopInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // Sync pool config to signaling server
  const syncConfigToServer = useCallback(async (currentPools: Pool[]) => {
    try {
      // Find the catch-all pool (default)
      const catchAllPool = currentPools.find(p => p.is_catch_all);
      
      // Convert routing rules to the format expected by the server
      const pathRules = currentPools.flatMap(pool => 
        pool.pool_routing_rules.map(rule => ({
          id: rule.id,
          orgId: organizationId,
          pathPattern: rule.path_pattern,
          domainPattern: rule.domain_pattern,
          conditions: rule.conditions || [],
          poolId: pool.id,
          priority: rule.priority,
          isActive: rule.is_active,
        }))
      );

      await fetch(`${SIGNALING_SERVER}/api/config/org`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: organizationId,
          defaultPoolId: catchAllPool?.id ?? null,
          pathRules,
        }),
      });
      
      console.log("[Pools] Config synced to signaling server");
    } catch (error) {
      console.error("[Pools] Failed to sync config:", error);
    }
  }, [organizationId]);

  // Sync config on initial load and when pools change
  useEffect(() => {
    syncConfigToServer(pools);
  }, [pools, syncConfigToServer]);

  // Get agents not already in a specific pool
  const getAvailableAgents = (pool: Pool) => {
    const memberIds = pool.agent_pool_members.map(m => m.agent_profile_id);
    return agents.filter(a => !memberIds.includes(a.id));
  };

  // Get available videos from other pools for reuse
  const getAvailableVideos = (currentPoolId: string, type: "wave" | "intro" | "loop") => {
    const fieldMap = {
      wave: "example_wave_video_url" as const,
      intro: "example_intro_video_url" as const,
      loop: "example_loop_video_url" as const,
    };
    const field = fieldMap[type];
    
    return pools
      .filter(p => p.id !== currentPoolId && p[field])
      .map(p => ({
        poolId: p.id,
        poolName: p.name,
        url: p[field]!,
      }));
  };

  // Select video from library (reuse from another pool)
  const handleSelectVideoFromLibrary = async (poolId: string, type: "wave" | "intro" | "loop", videoUrl: string) => {
    const fieldMap = {
      wave: "example_wave_video_url",
      intro: "example_intro_video_url",
      loop: "example_loop_video_url"
    };
    const updateField = fieldMap[type];
    
    const { error } = await supabase
      .from("agent_pools")
      .update({ [updateField]: videoUrl })
      .eq("id", poolId);

    if (!error) {
      setPools(pools.map(p => 
        p.id === poolId ? { ...p, [updateField]: videoUrl } : p
      ));
    }
  };

  const togglePoolExpanded = (poolId: string) => {
    const newExpanded = new Set(expandedPools);
    if (newExpanded.has(poolId)) {
      newExpanded.delete(poolId);
    } else {
      newExpanded.add(poolId);
    }
    setExpandedPools(newExpanded);
  };

  // Pool management
  const handleAddPool = async () => {
    if (!newPoolName.trim()) return;

    console.log("[Pools] Creating pool:", { name: newPoolName, organizationId });

    const { data, error } = await supabase
      .from("agent_pools")
      .insert({
        organization_id: organizationId,
        name: newPoolName,
        description: newPoolDescription || null,
        is_default: false,
        is_catch_all: false,
      })
      .select(`
        *,
        pool_routing_rules(*),
        agent_pool_members(id, agent_profile_id, agent_profiles(id, display_name))
      `)
      .single();

    if (error) {
      console.error("[Pools] Error creating pool:", error);
      // Better error message for duplicate names
      if (error.code === "23505" || error.message.includes("duplicate key")) {
        alert(`A pool named "${newPoolName}" already exists. Please choose a different name.`);
      } else {
        alert(`Failed to create pool: ${error.message}`);
      }
      return;
    }

    if (data) {
      console.log("[Pools] Pool created successfully:", data);
      setPools([...pools, data]);
      setNewPoolName("");
      setNewPoolDescription("");
      setIsAddingPool(false);
      setExpandedPools(new Set([...Array.from(expandedPools), data.id]));
    }
  };

  // Agent management
  const handleAddAgentToPool = async (poolId: string, agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    const { data, error } = await supabase
      .from("agent_pool_members")
      .insert({
        pool_id: poolId,
        agent_profile_id: agentId,
      })
      .select("id, agent_profile_id")
      .single();

    if (data && !error) {
      setPools(pools.map(p => {
        if (p.id === poolId) {
          return {
            ...p,
            agent_pool_members: [
              ...p.agent_pool_members,
              { ...data, agent_profiles: agent }
            ],
          };
        }
        return p;
      }));
      setAddingAgentToPool(null);
    }
  };

  const handleRemoveAgentFromPool = async (poolId: string, memberId: string) => {
    const { error } = await supabase
      .from("agent_pool_members")
      .delete()
      .eq("id", memberId);

    if (!error) {
      setPools(pools.map(p => {
        if (p.id === poolId) {
          return {
            ...p,
            agent_pool_members: p.agent_pool_members.filter(m => m.id !== memberId),
          };
        }
        return p;
      }));
    }
  };

  const handleDeletePool = async (poolId: string) => {
    const pool = pools.find(p => p.id === poolId);
    if (pool?.is_catch_all) return; // Can't delete the "All" pool

    const { error } = await supabase.from("agent_pools").delete().eq("id", poolId);
    if (!error) {
      setPools(pools.filter(p => p.id !== poolId));
    }
  };

  // Routing rule management
  const handleAddRoutingRule = async (poolId: string, conditions: RuleCondition[], ruleName: string) => {
    const pool = pools.find(p => p.id === poolId);
    if (!pool) return;

    const maxPriority = Math.max(0, ...pool.pool_routing_rules.map(r => r.priority));

    // Extract legacy patterns for backwards compatibility
    const domainCondition = conditions.find(c => c.type === "domain");
    const pathCondition = conditions.find(c => c.type === "path");

    // Save rule with conditions and name to database
    const { data, error } = await supabase
      .from("pool_routing_rules")
      .insert({
        pool_id: poolId,
        name: ruleName || null,
        domain_pattern: domainCondition?.value || "*",
        path_pattern: pathCondition?.value || "*",
        conditions: conditions,
        priority: maxPriority + 1,
        is_active: true,
      })
      .select()
      .single();

    if (data && !error) {
      setPools(pools.map(p => {
        if (p.id === poolId) {
          return {
            ...p,
            pool_routing_rules: [...p.pool_routing_rules, data],
          };
        }
        return p;
      }));
      setAddingRuleToPool(null);
    }
  };

  const handleDeleteRoutingRule = async (poolId: string, ruleId: string) => {
    const { error } = await supabase.from("pool_routing_rules").delete().eq("id", ruleId);
    if (!error) {
      setPools(pools.map(p => {
        if (p.id === poolId) {
          return {
            ...p,
            pool_routing_rules: p.pool_routing_rules.filter(r => r.id !== ruleId),
          };
        }
        return p;
      }));
    }
  };

  const handleUpdateRoutingRule = async (poolId: string, ruleId: string, conditions: RuleCondition[], ruleName: string) => {
    // Extract legacy patterns for backwards compatibility
    const domainCondition = conditions.find(c => c.type === "domain");
    const pathCondition = conditions.find(c => c.type === "path");

    const { data, error } = await supabase
      .from("pool_routing_rules")
      .update({
        name: ruleName || null,
        domain_pattern: domainCondition?.value || "*",
        path_pattern: pathCondition?.value || "*",
        conditions: conditions,
      })
      .eq("id", ruleId)
      .select()
      .single();

    if (data && !error) {
      setPools(pools.map(p => {
        if (p.id === poolId) {
          return {
            ...p,
            pool_routing_rules: p.pool_routing_rules.map(r => 
              r.id === ruleId ? data : r
            ),
          };
        }
        return p;
      }));
      setEditingRule(null);
    }
  };

  const getMemberCount = (pool: Pool) => {
    return pool.agent_pool_members?.length ?? 0;
  };

  // Intro script management
  const handleStartEditScript = (pool: Pool) => {
    setEditingScriptPoolId(pool.id);
    setEditingScriptText(pool.intro_script);
  };

  const handleSaveScript = async (poolId: string) => {
    const { error } = await supabase
      .from("agent_pools")
      .update({ intro_script: editingScriptText })
      .eq("id", poolId);

    if (!error) {
      setPools(pools.map(p => 
        p.id === poolId ? { ...p, intro_script: editingScriptText } : p
      ));
      setEditingScriptPoolId(null);
      setEditingScriptText("");
    }
  };

  const handleCancelEditScript = () => {
    setEditingScriptPoolId(null);
    setEditingScriptText("");
  };

  // Example video upload
  const handleUploadExampleVideo = async (poolId: string, type: "wave" | "intro" | "loop", file: File) => {
    setUploadingVideo({ poolId, type });
    
    try {
      const path = `${organizationId}/pools/${poolId}/example-${type}.${file.name.split('.').pop()}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(path);
      const videoUrl = urlData.publicUrl;

      // Update pool with the video URL
      const fieldMap = {
        wave: "example_wave_video_url",
        intro: "example_intro_video_url", 
        loop: "example_loop_video_url"
      };
      const updateField = fieldMap[type];
      const { error: updateError } = await supabase
        .from("agent_pools")
        .update({ [updateField]: videoUrl })
        .eq("id", poolId);

      if (updateError) throw updateError;

      // Update local state
      setPools(pools.map(p => 
        p.id === poolId 
          ? { ...p, [updateField]: videoUrl }
          : p
      ));
    } catch (error) {
      console.error("Failed to upload example video:", error);
      alert("Failed to upload video. Please try again.");
    } finally {
      setUploadingVideo(null);
    }
  };

  const handleRemoveExampleVideo = async (poolId: string, type: "wave" | "intro" | "loop") => {
    const fieldMap = {
      wave: "example_wave_video_url",
      intro: "example_intro_video_url",
      loop: "example_loop_video_url"
    };
    const updateField = fieldMap[type];
    
    const { error } = await supabase
      .from("agent_pools")
      .update({ [updateField]: null })
      .eq("id", poolId);

    if (!error) {
      setPools(pools.map(p => 
        p.id === poolId ? { ...p, [updateField]: null } : p
      ));
    }
  };

  // Save recorded video blob
  const handleSaveRecordedVideo = async (poolId: string, type: "wave" | "intro" | "loop", blob: Blob) => {
    setUploadingVideo({ poolId, type });
    
    try {
      const path = `${organizationId}/pools/${poolId}/example-${type}-${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(path, blob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "video/webm",
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(path);
      const videoUrl = urlData.publicUrl;

      const fieldMap = {
        wave: "example_wave_video_url",
        intro: "example_intro_video_url",
        loop: "example_loop_video_url"
      };
      const updateField = fieldMap[type];
      
      const { error: updateError } = await supabase
        .from("agent_pools")
        .update({ [updateField]: videoUrl })
        .eq("id", poolId);

      if (updateError) throw updateError;

      setPools(pools.map(p => 
        p.id === poolId ? { ...p, [updateField]: videoUrl } : p
      ));
    } catch (error) {
      console.error("Failed to save recorded video:", error);
      alert("Failed to save video. Please try again.");
    } finally {
      setUploadingVideo(null);
      setRecordingVideo(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Agent Pools</h1>
          <p className="text-muted-foreground">
            Route visitors to different agents based on domain and page rules
          </p>
        </div>
        <button
          onClick={() => setIsAddingPool(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          New Pool
        </button>
      </div>

      {/* Add Pool Form */}
      {isAddingPool && (
        <div className="bg-gradient-to-b from-muted/50 to-transparent border border-border rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Create New Pool</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground">Pool Name</label>
              <input
                type="text"
                placeholder="e.g., Sales Team, Support, Enterprise"
                value={newPoolName}
                onChange={(e) => setNewPoolName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground">Description (optional)</label>
              <input
                type="text"
                placeholder="What is this pool for?"
                value={newPoolDescription}
                onChange={(e) => setNewPoolDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAddPool}
                disabled={!newPoolName.trim()}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Create Pool
              </button>
              <button
                onClick={() => {
                  setIsAddingPool(false);
                  setNewPoolName("");
                  setNewPoolDescription("");
                }}
                className="px-6 py-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pools List */}
      <div className="space-y-4">
        {pools.map((pool) => {
          const isExpanded = expandedPools.has(pool.id);
          const memberCount = getMemberCount(pool);

          return (
            <div key={pool.id} className="bg-gradient-to-b from-muted/30 to-transparent border border-border rounded-2xl overflow-hidden">
              {/* Pool Header */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => togglePoolExpanded(pool.id)}
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{pool.name}</span>
                      {pool.is_catch_all && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-500 font-medium border border-emerald-500/20">
                          Catch All
                        </span>
                      )}
                    </div>
                    {pool.description && (
                      <p className="text-sm text-muted-foreground">{pool.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Agents</div>
                    <div className="font-semibold text-lg">{memberCount}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Rules</div>
                    <div className="font-semibold text-lg">{pool.pool_routing_rules.length}</div>
                  </div>
                  {!pool.is_catch_all && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePool(pool.id);
                      }}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-border">
                  {/* Routing Rules Section */}
                  <div className="p-6 border-b border-border">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Route className="w-4 h-4 text-primary" />
                          Routing Rules
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Define which visitors should be routed to this pool
                        </p>
                      </div>
                    </div>

                    {pool.is_catch_all ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <Globe className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-emerald-600 dark:text-emerald-400">Default Catch-All Pool</h5>
                            <p className="text-sm text-muted-foreground mt-1">
                              This pool automatically catches all visitors that don't match any other pool's rules. 
                              No routing rules are needed.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Current Rules */}
                        {pool.pool_routing_rules.length > 0 && (
                          <div className="space-y-3 mb-6">
                            {pool.pool_routing_rules
                              .sort((a, b) => b.priority - a.priority)
                              .map((rule) => (
                                editingRule?.poolId === pool.id && editingRule?.rule.id === rule.id ? (
                                  <RuleBuilder
                                    key={rule.id}
                                    poolName={pool.name}
                                    existingRule={rule}
                                    onSave={(conditions, ruleName) => handleUpdateRoutingRule(pool.id, rule.id, conditions, ruleName)}
                                    onCancel={() => setEditingRule(null)}
                                  />
                                ) : (
                                  <RuleDisplay
                                    key={rule.id}
                                    rule={rule}
                                    onDelete={() => handleDeleteRoutingRule(pool.id, rule.id)}
                                    onEdit={() => setEditingRule({ poolId: pool.id, rule })}
                                  />
                                )
                              ))}
                          </div>
                        )}

                        {/* Add Rule Section */}
                        {addingRuleToPool === pool.id ? (
                          <RuleBuilder
                            poolName={pool.name}
                            onSave={(conditions, ruleName) => handleAddRoutingRule(pool.id, conditions, ruleName)}
                            onCancel={() => setAddingRuleToPool(null)}
                          />
                        ) : !editingRule ? (
                          <button
                            onClick={() => setAddingRuleToPool(pool.id)}
                            className="w-full p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group"
                          >
                            {pool.pool_routing_rules.length === 0 ? (
                              <div className="text-center">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                                  <Plus className="w-6 h-6 text-primary" />
                                </div>
                                <div className="font-semibold text-lg group-hover:text-primary transition-colors">
                                  Add Your First Routing Rule
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                                  Define conditions to route visitors to this pool based on domain or page path
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2 text-muted-foreground group-hover:text-primary">
                                <Plus className="w-5 h-5" />
                                <span className="font-medium">Add Another Rule</span>
                              </div>
                            )}
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>

                  {/* Video Sequence Section */}
                  <div className="p-6 border-b border-border">
                    <div className="mb-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Video className="w-4 h-4 text-primary" />
                        Video Sequence
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Example videos agents will model when recording
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {/* 1. Wave Example */}
                      <div className="p-4 rounded-xl border border-border bg-gradient-to-b from-muted/30 to-transparent">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</div>
                          <div className="text-sm font-medium">Wave</div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Grabs attention, plays muted
                        </p>
                        
                        {(() => {
                          const videoUrl = pool.example_wave_video_url || defaultVideos.wave;
                          const isDefault = !pool.example_wave_video_url && defaultVideos.wave;
                          
                          return (
                            <div className="space-y-2">
                              {/* Video Preview */}
                              {videoUrl ? (
                                <div className="relative">
                                  <video 
                                    src={videoUrl} 
                                    controls 
                                    className="w-full rounded-lg aspect-video object-cover bg-black"
                                  />
                                  {isDefault && (
                                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary/80 text-primary-foreground text-[10px] font-medium">
                                      Default
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="aspect-video rounded-lg bg-black/50 flex items-center justify-center border-2 border-dashed border-border">
                                  <span className="text-xs text-muted-foreground">No video set</span>
                                </div>
                              )}

                              {/* Stacked Buttons - 1 per line */}
                              <div className="space-y-1.5 text-xs">
                                <button
                                  onClick={() => setRecordingVideo({ poolId: pool.id, type: "wave" })}
                                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                                >
                                  <Camera className="w-3 h-3" /> Record
                                </button>
                                <label className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                                  <input type="file" accept="video/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadExampleVideo(pool.id, "wave", file); }} disabled={uploadingVideo?.poolId === pool.id && uploadingVideo?.type === "wave"} />
                                  {uploadingVideo?.poolId === pool.id && uploadingVideo?.type === "wave" ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Upload className="w-3 h-3" /> Upload</>}
                                </label>
                                {/* Re-use Dropdown */}
                                <div className="relative">
                                  <select
                                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs font-medium focus:border-primary outline-none cursor-pointer appearance-none pr-8 text-center"
                                    defaultValue=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleSelectVideoFromLibrary(pool.id, "wave", e.target.value);
                                      }
                                    }}
                                  >
                                    <option value="" disabled>
                                      Re-use from pool...
                                    </option>
                                    {getAvailableVideos(pool.id, "wave").map((v) => (
                                      <option key={v.poolId} value={v.url}>
                                        {v.poolName}
                                      </option>
                                    ))}
                                  </select>
                                  <Library className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                                </div>
                                {pool.example_wave_video_url && (
                                  <button 
                                    onClick={() => handleRemoveExampleVideo(pool.id, "wave")} 
                                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" /> Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 2. Intro/Speak */}
                      <div className="p-4 rounded-xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">2</div>
                          <div className="text-sm font-medium">Speak</div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Plays with audio
                        </p>
                        
                        {(() => {
                          const videoUrl = pool.example_intro_video_url || defaultVideos.intro;
                          const isDefault = !pool.example_intro_video_url && defaultVideos.intro;
                          
                          return (
                            <div className="space-y-2">
                              {/* Video Preview */}
                              {videoUrl ? (
                                <div className="relative">
                                  <video 
                                    src={videoUrl} 
                                    controls 
                                    className="w-full rounded-lg aspect-video object-cover bg-black"
                                  />
                                  {isDefault && (
                                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary/80 text-primary-foreground text-[10px] font-medium">
                                      Default
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="aspect-video rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground">No video set</span>
                                </div>
                              )}

                              {/* Stacked Buttons - 1 per line */}
                              <div className="space-y-1.5 text-xs">
                                <button
                                  onClick={() => setRecordingVideo({ poolId: pool.id, type: "intro" })}
                                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-primary/30 hover:bg-primary/10 transition-colors"
                                >
                                  <Camera className="w-3 h-3" /> Record
                                </button>
                                <label className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-primary/30 hover:bg-primary/10 transition-colors cursor-pointer">
                                  <input type="file" accept="video/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadExampleVideo(pool.id, "intro", file); }} disabled={uploadingVideo?.poolId === pool.id && uploadingVideo?.type === "intro"} />
                                  {uploadingVideo?.poolId === pool.id && uploadingVideo?.type === "intro" ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Upload className="w-3 h-3" /> Upload</>}
                                </label>
                                {/* Re-use Dropdown */}
                                <div className="relative">
                                  <select
                                    className="w-full px-3 py-2 rounded-lg bg-background border border-primary/30 text-xs font-medium focus:border-primary outline-none cursor-pointer appearance-none pr-8 text-center"
                                    defaultValue=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleSelectVideoFromLibrary(pool.id, "intro", e.target.value);
                                      }
                                    }}
                                  >
                                    <option value="" disabled>
                                      Re-use from pool...
                                    </option>
                                    {getAvailableVideos(pool.id, "intro").map((v) => (
                                      <option key={v.poolId} value={v.url}>
                                        {v.poolName}
                                      </option>
                                    ))}
                                  </select>
                                  <Library className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                                </div>
                                {pool.example_intro_video_url && (
                                  <button 
                                    onClick={() => handleRemoveExampleVideo(pool.id, "intro")} 
                                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" /> Remove
                                  </button>
                                )}
                              </div>

                              {/* Inline Script Editor */}
                              <div className="pt-2 border-t border-primary/20">
                                <div className="flex items-center gap-1 mb-1.5">
                                  <MessageSquare className="w-3 h-3 text-primary" />
                                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Script</span>
                                </div>
                                {editingScriptPoolId === pool.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editingScriptText}
                                      onChange={(e) => setEditingScriptText(e.target.value)}
                                      placeholder="Enter script..."
                                      rows={2}
                                      className="w-full px-2 py-1.5 rounded-lg bg-background border border-border focus:border-primary outline-none resize-none text-xs"
                                      autoFocus
                                    />
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => handleSaveScript(pool.id)}
                                        disabled={!editingScriptText.trim()}
                                        className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-medium hover:bg-primary/90 disabled:opacity-50"
                                      >
                                        <Check className="w-3 h-3" /> Save
                                      </button>
                                      <button
                                        onClick={handleCancelEditScript}
                                        className="flex-1 py-1 rounded-lg bg-muted text-muted-foreground text-[10px] hover:bg-muted/80"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleStartEditScript(pool)}
                                    className="w-full text-left p-2 rounded-lg bg-primary/5 border border-primary/20 hover:border-primary/40 transition-colors group"
                                  >
                                    <p className="text-xs leading-relaxed">"{pool.intro_script}"</p>
                                    <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">Click to edit</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 3. Loop Example */}
                      <div className="p-4 rounded-xl border border-border bg-gradient-to-b from-muted/30 to-transparent">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">3</div>
                          <div className="text-sm font-medium">Loop</div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Smiles while waiting
                        </p>
                        
                        {(() => {
                          const videoUrl = pool.example_loop_video_url || defaultVideos.loop;
                          const isDefault = !pool.example_loop_video_url && defaultVideos.loop;
                          
                          return (
                            <div className="space-y-2">
                              {/* Video Preview */}
                              {videoUrl ? (
                                <div className="relative">
                                  <video 
                                    src={videoUrl} 
                                    controls 
                                    className="w-full rounded-lg aspect-video object-cover bg-black"
                                  />
                                  {isDefault && (
                                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary/80 text-primary-foreground text-[10px] font-medium">
                                      Default
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="aspect-video rounded-lg bg-black/50 flex items-center justify-center border-2 border-dashed border-border">
                                  <span className="text-xs text-muted-foreground">No video set</span>
                                </div>
                              )}

                              {/* Stacked Buttons - 1 per line */}
                              <div className="space-y-1.5 text-xs">
                                <button
                                  onClick={() => setRecordingVideo({ poolId: pool.id, type: "loop" })}
                                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                                >
                                  <Camera className="w-3 h-3" /> Record
                                </button>
                                <label className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                                  <input type="file" accept="video/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadExampleVideo(pool.id, "loop", file); }} disabled={uploadingVideo?.poolId === pool.id && uploadingVideo?.type === "loop"} />
                                  {uploadingVideo?.poolId === pool.id && uploadingVideo?.type === "loop" ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Upload className="w-3 h-3" /> Upload</>}
                                </label>
                                {/* Re-use Dropdown */}
                                <div className="relative">
                                  <select
                                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs font-medium focus:border-primary outline-none cursor-pointer appearance-none pr-8 text-center"
                                    defaultValue=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleSelectVideoFromLibrary(pool.id, "loop", e.target.value);
                                      }
                                    }}
                                  >
                                    <option value="" disabled>
                                      Re-use from pool...
                                    </option>
                                    {getAvailableVideos(pool.id, "loop").map((v) => (
                                      <option key={v.poolId} value={v.url}>
                                        {v.poolName}
                                      </option>
                                    ))}
                                  </select>
                                  <Library className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                                </div>
                                {pool.example_loop_video_url && (
                                  <button 
                                    onClick={() => handleRemoveExampleVideo(pool.id, "loop")} 
                                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" /> Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Video Recorder Modal */}
                  {recordingVideo?.poolId === pool.id && (
                    <VideoRecorderModal
                      isOpen={true}
                      type={recordingVideo.type}
                      script={recordingVideo.type === "intro" ? pool.intro_script : undefined}
                      onSave={(blob) => handleSaveRecordedVideo(pool.id, recordingVideo.type, blob)}
                      onClose={() => setRecordingVideo(null)}
                    />
                  )}

                  {/* Widget Settings Section */}
                  <PoolWidgetSettings
                    pool={pool}
                    orgDefaults={orgDefaultWidgetSettings}
                    onUpdate={(settings) => {
                      setPools(pools.map(p => 
                        p.id === pool.id ? { ...p, widget_settings: settings } : p
                      ));
                    }}
                  />

                  {/* Agents Section */}
                  <div className="p-6 bg-muted/10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Agents ({memberCount})
                      </h4>
                      <button
                        onClick={() => setAddingAgentToPool(addingAgentToPool === pool.id ? null : pool.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Agent
                      </button>
                    </div>

                    {/* Add Agent Dropdown */}
                    {addingAgentToPool === pool.id && (
                      <div className="mb-4 p-4 rounded-xl bg-background border border-border">
                        <div className="text-sm font-medium mb-3 text-muted-foreground">Select an agent to add:</div>
                        {getAvailableAgents(pool).length === 0 ? (
                          <div className="text-sm text-muted-foreground py-2">
                            All agents are already in this pool
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-auto">
                            {getAvailableAgents(pool).map((agent) => (
                              <button
                                key={agent.id}
                                onClick={() => handleAddAgentToPool(pool.id, agent.id)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                              >
                                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                                  {agent.display_name?.charAt(0).toUpperCase() || "?"}
                                </div>
                                <span className="font-medium">{agent.display_name || "Unnamed Agent"}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Current Agents */}
                    {memberCount > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {pool.agent_pool_members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-background border border-border group hover:border-primary/30 transition-colors"
                          >
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                              {member.agent_profiles?.display_name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <span className="text-sm font-medium">
                              {member.agent_profiles?.display_name || "Unnamed Agent"}
                            </span>
                            <button
                              onClick={() => handleRemoveAgentFromPool(pool.id, member.id)}
                              className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                              title="Remove from pool"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-4 text-center bg-muted/20 rounded-xl">
                        No agents assigned yet. Click "Add Agent" to get started.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {pools.length === 0 && (
          <div className="bg-gradient-to-b from-muted/30 to-transparent border border-border rounded-2xl p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
              <Layers className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Create Your First Pool</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Pools let you assign specific agents to specific domains and pages.
            </p>
            <button
              onClick={() => setIsAddingPool(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-lg shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5" />
              Create Your First Pool
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
