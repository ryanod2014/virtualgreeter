"use client";

import { useEffect, useState } from "react";
import { Phone, PhoneOff, User, Globe, Clock } from "lucide-react";
import type { CallIncomingPayload } from "@ghost-greeter/domain";

interface IncomingCallModalProps {
  incomingCall: CallIncomingPayload | null;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string, reason?: string) => void;
}

export function IncomingCallModal({
  incomingCall,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!incomingCall) {
      setTimeElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [incomingCall]);

  if (!incomingCall) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative glass rounded-3xl p-8 max-w-md w-full mx-4 animate-fade-in">
        {/* Pulsing ring */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-success via-emerald-400 to-success opacity-30 blur-xl animate-pulse" />

        <div className="relative">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-success/30 flex items-center justify-center">
                  <Phone className="w-8 h-8 text-success animate-pulse" />
                </div>
              </div>
              {/* Animated rings */}
              <span className="absolute inset-0 rounded-full border-2 border-success/50 animate-ping" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Incoming Request</h2>
            <p className="text-muted-foreground">
              A visitor wants to connect live
            </p>
          </div>

          {/* Visitor Info */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Visitor ID</p>
                <p className="font-medium font-mono text-sm">
                  {incomingCall.visitor.visitorId.slice(0, 20)}...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Page URL</p>
                <p className="font-medium text-sm truncate max-w-[250px]">
                  {incomingCall.visitor.pageUrl}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Time on page</p>
                <p className="font-medium">
                  {formatTime(
                    Math.floor((Date.now() - incomingCall.visitor.connectedAt) / 1000)
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="text-center mb-6">
            <span className="text-sm text-muted-foreground">
              Request expires in {30 - timeElapsed}s
            </span>
            <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-success transition-all duration-1000"
                style={{ width: `${((30 - timeElapsed) / 30) * 100}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => onReject(incomingCall.request.requestId, "Busy")}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
            >
              <PhoneOff className="w-5 h-5" />
              Decline
            </button>
            <button
              onClick={() => onAccept(incomingCall.request.requestId)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-success text-white hover:bg-success/90 transition-colors font-medium"
            >
              <Phone className="w-5 h-5" />
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

