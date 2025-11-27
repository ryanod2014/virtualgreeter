"use client";

import { useState, useEffect } from "react";
import { CheckCircle, X, Loader2, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Disposition {
  id: string;
  name: string;
  color: string;
  fb_event_name?: string | null;
  fb_event_enabled?: boolean;
  value?: number | null;
}

interface PostCallDispositionModalProps {
  isOpen: boolean;
  callLogId: string | null;
  onClose: () => void;
  organizationId: string;
}

export function PostCallDispositionModal({
  isOpen,
  callLogId,
  onClose,
  organizationId,
}: PostCallDispositionModalProps) {
  const [dispositions, setDispositions] = useState<Disposition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch dispositions when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDispositions();
    }
  }, [isOpen, organizationId]);

  const fetchDispositions = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("dispositions")
      .select("id, name, color, fb_event_name, fb_event_enabled, value")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("display_order");

    setDispositions(data ?? []);
    setIsLoading(false);
  };

  const handleSelect = async (dispositionId: string) => {
    if (!callLogId || isSaving) return;

    const selectedDisposition = dispositions.find((d) => d.id === dispositionId);
    console.log("[Disposition] Updating call log:", callLogId, "with disposition:", dispositionId);
    setSelectedId(dispositionId);
    setIsSaving(true);

    try {
      const { data, error } = await supabase
        .from("call_logs")
        .update({ disposition_id: dispositionId })
        .eq("id", callLogId)
        .select();

      if (error) {
        console.error("[Disposition] Supabase error:", error);
      } else {
        console.log("[Disposition] Update result:", data);
      }

      // Fire Facebook Conversion API event if configured
      if (selectedDisposition?.fb_event_enabled && selectedDisposition?.fb_event_name) {
        console.log("[Disposition] Firing Facebook event:", selectedDisposition.fb_event_name);
        try {
          const fbResponse = await fetch("/api/facebook/capi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dispositionId,
              callLogId,
              pageUrl: window.location.href,
              userAgent: navigator.userAgent,
              // Get Facebook cookies if available
              fbc: getCookie("_fbc"),
              fbp: getCookie("_fbp"),
            }),
          });
          
          const fbResult = await fbResponse.json();
          if (fbResult.fired) {
            console.log("[Disposition] Facebook event fired:", fbResult.event_name, fbResult.event_id);
          } else {
            console.log("[Disposition] Facebook event not fired:", fbResult.reason || fbResult.error);
          }
        } catch (fbError) {
          console.error("[Disposition] Failed to fire Facebook event:", fbError);
          // Don't fail the disposition save if FB event fails
        }
      }

      // Short delay to show the checkmark
      await new Promise((resolve) => setTimeout(resolve, 500));
      onClose();
    } catch (error) {
      console.error("[Disposition] Failed to save disposition:", error);
    } finally {
      setIsSaving(false);
      setSelectedId(null);
    }
  };

  // Helper to get cookie value
  const getCookie = (name: string): string | undefined => {
    if (typeof document === "undefined") return undefined;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return undefined;
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="relative glass rounded-3xl p-8 max-w-md w-full mx-4 animate-fade-in">
        {/* Close Button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Call Ended</h2>
          <p className="text-muted-foreground">
            How did this call go? Select a disposition:
          </p>
        </div>

        {/* Dispositions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : dispositions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No dispositions configured.</p>
            <p className="text-sm mt-1">
              An admin can add them in Settings → Dispositions
            </p>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {dispositions.map((disposition) => (
              <button
                key={disposition.id}
                onClick={() => handleSelect(disposition.id)}
                disabled={isSaving}
                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${
                  selectedId === disposition.id
                    ? "bg-primary/20 border-2 border-primary"
                    : "bg-muted/30 border-2 border-transparent hover:bg-muted/50"
                } ${isSaving && selectedId !== disposition.id ? "opacity-50" : ""}`}
              >
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: disposition.color }}
                />
                <span className="font-medium flex-1 text-left flex items-center gap-2">
                  {disposition.name}
                  {disposition.fb_event_enabled && disposition.fb_event_name && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1877F2]/10 text-[#1877F2] text-xs">
                      <Zap className="w-3 h-3" />
                      {disposition.fb_event_name}
                    </span>
                  )}
                </span>
                {selectedId === disposition.id && isSaving && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
                {selectedId === disposition.id && !isSaving && (
                  <CheckCircle className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Skip Button */}
        <button
          onClick={handleSkip}
          disabled={isSaving}
          className="w-full py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors text-sm"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

