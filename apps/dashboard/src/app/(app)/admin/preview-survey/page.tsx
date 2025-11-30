"use client";

import { useState } from "react";
import { EllisSurveyModal } from "@/features/surveys/ellis-survey-modal";
import { RefreshCw, Eye, EyeOff } from "lucide-react";

export default function PreviewSurveyPage() {
  const [showSurvey, setShowSurvey] = useState(true);
  const [key, setKey] = useState(0);

  const handleClose = () => {
    setShowSurvey(false);
  };

  const handleReset = () => {
    setShowSurvey(false);
    // Reset the modal state by incrementing the key
    setTimeout(() => {
      setKey((k) => k + 1);
      setShowSurvey(true);
    }, 100);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">PMF Survey Preview</h1>
        <p className="text-muted-foreground">
          Preview the Sean Ellis "How disappointed would you be?" survey modal.
          This is a preview mode - submissions will not be saved.
        </p>
      </div>

      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setShowSurvey(true)}
          disabled={showSurvey}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Eye className="w-4 h-4" />
          Show Survey
        </button>
        
        <button
          onClick={() => setShowSurvey(false)}
          disabled={!showSurvey}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <EyeOff className="w-4 h-4" />
          Hide Survey
        </button>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reset & Show
        </button>
      </div>

      <div className="p-6 rounded-xl bg-muted/30 border border-border">
        <h2 className="font-semibold mb-3">About this Survey</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• <strong>Purpose:</strong> Measure Product-Market Fit (PMF) using the Sean Ellis test</li>
          <li>• <strong>Question:</strong> "How disappointed would you be if you could no longer use GreetNow?"</li>
          <li>• <strong>Target:</strong> 40%+ "Very disappointed" = strong PMF</li>
          <li>• <strong>Trigger:</strong> Randomly 5-20 minutes into a user session</li>
          <li>• <strong>Cooldown:</strong> Won't show again for 30 days after responding</li>
        </ul>
      </div>

      {/* Survey Modal in Preview Mode */}
      <PreviewSurveyModal 
        key={key}
        isOpen={showSurvey} 
        onClose={handleClose} 
      />
    </div>
  );
}

// A wrapper that uses mock data for preview
function PreviewSurveyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <EllisSurveyModal
      isOpen={isOpen}
      onClose={onClose}
      userId="preview-user-id"
      userRole="admin"
      organizationId="preview-org-id"
      triggeredBy="preview"
      pageUrl="/admin/preview-survey"
    />
  );
}

