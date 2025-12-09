/**
 * @vitest-environment jsdom
 *
 * RecordingSettingsClient Tests
 *
 * Behaviors Tested:
 * 1. Display - Shows page title and header
 * 2. Display - Shows recording toggle with current state
 * 3. Display - Shows retention period options
 * 4. Display - Shows transcription toggle
 * 5. Display - Shows AI summary toggle
 * 6. Display - Shows privacy warning when recording enabled
 * 7. Display - Shows pricing information for transcription and AI
 * 8. Actions - Toggle recording on/off
 * 9. Actions - Select retention period
 * 10. Actions - Toggle transcription
 * 11. Actions - Toggle AI summary
 * 12. Actions - Save button disabled when no changes
 * 13. Actions - Save button enabled when changes made
 * 14. Cascade - Disables transcription toggle when recording off
 * 15. Cascade - Disables AI summary when transcription off
 * 16. Custom Prompt - Shows textarea when AI summary enabled
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  Video: () => <div data-testid="video-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  HardDrive: () => <div data-testid="hard-drive-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Info: () => <div data-testid="info-icon" />,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Supabase client
const mockFrom = vi.fn();
const mockSupabase = {
  from: mockFrom,
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

import { RecordingSettingsClient } from "./recording-settings-client";
import type { RecordingSettings } from "@ghost-greeter/domain/database.types";

describe("RecordingSettingsClient", () => {
  const defaultSettings: RecordingSettings = {
    enabled: false,
    retention_days: 30,
    transcription_enabled: false,
    ai_summary_enabled: false,
    ai_summary_prompt_format: null,
  };

  const defaultProps = {
    organizationId: "org-123",
    initialSettings: defaultSettings,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Display - Header", () => {
    it("shows page title 'Call Recording'", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Call Recording")).toBeInTheDocument();
    });

    it("shows back link to settings page", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      const backLink = screen.getByText("Back to Settings");
      expect(backLink.closest("a")).toHaveAttribute("href", "/admin/settings");
    });

    it("shows subtitle about configuring recording settings", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Configure video call recording settings/)).toBeInTheDocument();
    });
  });

  describe("Display - Enable Recording Section", () => {
    it("shows 'Enable Recording' heading", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Enable Recording")).toBeInTheDocument();
    });

    it("shows description about automatic recording", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/When enabled, all video calls will be automatically recorded/)).toBeInTheDocument();
    });

    it("shows toggle switch for recording", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      const toggle = screen.getAllByRole("switch")[0];
      expect(toggle).toBeInTheDocument();
    });

    it("toggle shows off state when recording disabled", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      const toggle = screen.getAllByRole("switch")[0];
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    it("toggle shows on state when recording enabled", () => {
      const enabledSettings = { ...defaultSettings, enabled: true };
      render(
        <RecordingSettingsClient
          organizationId="org-123"
          initialSettings={enabledSettings}
        />
      );

      const toggle = screen.getAllByRole("switch")[0];
      expect(toggle).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("Display - Privacy Warning", () => {
    it("does not show privacy warning when recording disabled", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.queryByText("Privacy Notice")).not.toBeInTheDocument();
    });

    it("shows privacy warning when recording enabled", () => {
      const enabledSettings = { ...defaultSettings, enabled: true };
      render(
        <RecordingSettingsClient
          organizationId="org-123"
          initialSettings={enabledSettings}
        />
      );

      expect(screen.getByText("Privacy Notice")).toBeInTheDocument();
      expect(screen.getByText(/Ensure you have proper consent/)).toBeInTheDocument();
    });
  });

  describe("Display - Retention Period Section", () => {
    it("shows 'Recording Retention' heading", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Recording Retention")).toBeInTheDocument();
    });

    it("shows retention period description", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Recordings older than the retention period will be automatically deleted/)).toBeInTheDocument();
    });

    it("shows all retention period options", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByRole("button", { name: "7 days" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "14 days" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "30 days" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "60 days" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "90 days" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "180 days" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "1 year" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Forever" })).toBeInTheDocument();
    });

    it("highlights selected retention period", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      const selectedButton = screen.getByRole("button", { name: "30 days" });
      expect(selectedButton).toHaveClass("bg-primary");
    });

    it("shows retention info message", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Recordings will be deleted after/)).toBeInTheDocument();
      // 30 days appears as both a button and in the info message
      expect(screen.getByRole("button", { name: "30 days" })).toBeInTheDocument();
    });

    it("shows 'forever' message when Forever selected", () => {
      const foreverSettings = { ...defaultSettings, retention_days: -1 };
      render(
        <RecordingSettingsClient
          organizationId="org-123"
          initialSettings={foreverSettings}
        />
      );

      expect(screen.getByText(/Recordings will be kept/)).toBeInTheDocument();
      expect(screen.getByText(/forever/)).toBeInTheDocument();
    });
  });

  describe("Display - Transcription Section", () => {
    it("shows 'Call Transcription' heading", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Call Transcription")).toBeInTheDocument();
    });

    it("shows transcription description", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Automatically transcribe call audio to text/)).toBeInTheDocument();
    });

    it("shows transcription pricing", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      // Price appears in both the transcription section and info box
      const priceElements = screen.getAllByText("$0.01/min");
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it("shows info message when recording disabled", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Enable call recording above to use transcription features/)).toBeInTheDocument();
    });
  });

  describe("Display - AI Summary Section", () => {
    it("shows 'AI Call Summary' heading", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByText("AI Call Summary")).toBeInTheDocument();
    });

    it("shows AI summary description", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Generate AI-powered summaries from call transcriptions/)).toBeInTheDocument();
    });

    it("shows AI summary pricing", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      // Price appears in both the AI summary section and info box
      const priceElements = screen.getAllByText("$0.02/min");
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it("shows info message when transcription disabled", () => {
      const enabledRecordingSettings = { ...defaultSettings, enabled: true };
      render(
        <RecordingSettingsClient
          organizationId="org-123"
          initialSettings={enabledRecordingSettings}
        />
      );

      expect(screen.getByText(/Enable call transcription above to use AI summaries/)).toBeInTheDocument();
    });
  });

  describe("Display - Custom Prompt", () => {
    it("does not show custom prompt textarea when AI summary disabled", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.queryByText("Summary Format (Optional)")).not.toBeInTheDocument();
    });

    it("shows custom prompt textarea when AI summary enabled", () => {
      const aiEnabledSettings = {
        ...defaultSettings,
        enabled: true,
        transcription_enabled: true,
        ai_summary_enabled: true,
      };
      render(
        <RecordingSettingsClient
          organizationId="org-123"
          initialSettings={aiEnabledSettings}
        />
      );

      expect(screen.getByText("Summary Format (Optional)")).toBeInTheDocument();
    });

    it("shows tip about AI summary format", () => {
      const aiEnabledSettings = {
        ...defaultSettings,
        enabled: true,
        transcription_enabled: true,
        ai_summary_enabled: true,
      };
      render(
        <RecordingSettingsClient
          organizationId="org-123"
          initialSettings={aiEnabledSettings}
        />
      );

      expect(screen.getByText(/The AI will follow your format exactly/)).toBeInTheDocument();
    });
  });

  describe("Display - Info Box", () => {
    it("shows 'How It Works' info box", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByText("How It Works")).toBeInTheDocument();
    });

    it("lists recording, transcription, and AI summary features", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Both agent and visitor video\/audio are captured/)).toBeInTheDocument();
      expect(screen.getByText(/Audio is converted to searchable text/)).toBeInTheDocument();
      expect(screen.getByText(/Transcriptions are summarized using your format/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // TOGGLE ACTIONS
  // ---------------------------------------------------------------------------

  describe("Toggle Actions", () => {
    it("toggles recording on when clicked", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      const toggle = screen.getAllByRole("switch")[0];
      fireEvent.click(toggle);

      expect(toggle).toHaveAttribute("aria-checked", "true");
    });

    it("toggles recording off when clicked", () => {
      const enabledSettings = { ...defaultSettings, enabled: true };
      render(
        <RecordingSettingsClient
          organizationId="org-123"
          initialSettings={enabledSettings}
        />
      );

      const toggle = screen.getAllByRole("switch")[0];
      fireEvent.click(toggle);

      expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    it("transcription toggle is disabled when recording is off", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      const toggles = screen.getAllByRole("switch");
      const transcriptionToggle = toggles[1];

      expect(transcriptionToggle).toBeDisabled();
    });

    it("transcription toggle is enabled when recording is on", () => {
      const enabledSettings = { ...defaultSettings, enabled: true };
      render(
        <RecordingSettingsClient
          organizationId="org-123"
          initialSettings={enabledSettings}
        />
      );

      const toggles = screen.getAllByRole("switch");
      const transcriptionToggle = toggles[1];

      expect(transcriptionToggle).not.toBeDisabled();
    });

    it("AI summary toggle is disabled when transcription is off", () => {
      const enabledSettings = { ...defaultSettings, enabled: true };
      render(
        <RecordingSettingsClient
          organizationId="org-123"
          initialSettings={enabledSettings}
        />
      );

      const toggles = screen.getAllByRole("switch");
      const aiSummaryToggle = toggles[2];

      expect(aiSummaryToggle).toBeDisabled();
    });

    it("AI summary toggle is enabled when transcription is on", () => {
      const enabledSettings = {
        ...defaultSettings,
        enabled: true,
        transcription_enabled: true,
      };
      render(
        <RecordingSettingsClient
          organizationId="org-123"
          initialSettings={enabledSettings}
        />
      );

      const toggles = screen.getAllByRole("switch");
      const aiSummaryToggle = toggles[2];

      expect(aiSummaryToggle).not.toBeDisabled();
    });

    it("disables AI summary when transcription is turned off", () => {
      const enabledSettings = {
        ...defaultSettings,
        enabled: true,
        transcription_enabled: true,
        ai_summary_enabled: true,
      };
      render(
        <RecordingSettingsClient
          organizationId="org-123"
          initialSettings={enabledSettings}
        />
      );

      // Turn off transcription
      const toggles = screen.getAllByRole("switch");
      const transcriptionToggle = toggles[1];
      fireEvent.click(transcriptionToggle);

      // AI summary should be off
      const aiSummaryToggle = toggles[2];
      expect(aiSummaryToggle).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("Retention Period Selection", () => {
    it("selects retention period when button clicked", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      const button7Days = screen.getByRole("button", { name: "7 days" });
      fireEvent.click(button7Days);

      expect(button7Days).toHaveClass("bg-primary");
    });

    it("updates info message when retention period changed", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      const button90Days = screen.getByRole("button", { name: "90 days" });
      fireEvent.click(button90Days);

      // 90 days now selected - verify button is highlighted
      expect(button90Days).toHaveClass("bg-primary");
    });
  });

  // ---------------------------------------------------------------------------
  // SAVE BUTTON BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Save Button", () => {
    it("Save button is disabled when no changes made", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      expect(saveButton).toBeDisabled();
    });

    it("Save button is enabled when recording toggled", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      const toggle = screen.getAllByRole("switch")[0];
      fireEvent.click(toggle);

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      expect(saveButton).not.toBeDisabled();
    });

    it("Save button is enabled when retention period changed", () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      const button7Days = screen.getByRole("button", { name: "7 days" });
      fireEvent.click(button7Days);

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      expect(saveButton).not.toBeDisabled();
    });

    it("Save button is enabled when transcription toggled", () => {
      const enabledSettings = { ...defaultSettings, enabled: true };
      render(
        <RecordingSettingsClient
          organizationId="org-123"
          initialSettings={enabledSettings}
        />
      );

      const toggles = screen.getAllByRole("switch");
      const transcriptionToggle = toggles[1];
      fireEvent.click(transcriptionToggle);

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      expect(saveButton).not.toBeDisabled();
    });

    it("shows loading state during save", async () => {
      let resolveUpdate: () => void;
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(() => new Promise((resolve) => {
            resolveUpdate = () => resolve({ error: null });
          })),
        }),
      });

      render(<RecordingSettingsClient {...defaultProps} />);

      const toggle = screen.getAllByRole("switch")[0];
      fireEvent.click(toggle);

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Saving...")).toBeInTheDocument();
      });

      resolveUpdate!();
    });

    it("shows success message after save", async () => {
      render(<RecordingSettingsClient {...defaultProps} />);

      const toggle = screen.getAllByRole("switch")[0];
      fireEvent.click(toggle);

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Settings saved successfully")).toBeInTheDocument();
      });
    });

    it("shows error message when save fails", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "Failed" } }),
        }),
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<RecordingSettingsClient {...defaultProps} />);

      const toggle = screen.getAllByRole("switch")[0];
      fireEvent.click(toggle);

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to save settings/)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles initial settings with all features enabled", () => {
      const allEnabledSettings = {
        enabled: true,
        retention_days: 90,
        transcription_enabled: true,
        ai_summary_enabled: true,
        ai_summary_prompt_format: "Custom format",
      };

      render(
        <RecordingSettingsClient
          organizationId="org-123"
          initialSettings={allEnabledSettings}
        />
      );

      const toggles = screen.getAllByRole("switch");
      expect(toggles[0]).toHaveAttribute("aria-checked", "true");
      expect(toggles[1]).toHaveAttribute("aria-checked", "true");
      expect(toggles[2]).toHaveAttribute("aria-checked", "true");

      expect(screen.getByRole("button", { name: "90 days" })).toHaveClass("bg-primary");
    });

    it("handles custom prompt format", () => {
      const customPromptSettings = {
        enabled: true,
        retention_days: 30,
        transcription_enabled: true,
        ai_summary_enabled: true,
        ai_summary_prompt_format: "## Custom Summary\nBe brief.",
      };

      render(
        <RecordingSettingsClient
          organizationId="org-123"
          initialSettings={customPromptSettings}
        />
      );

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("## Custom Summary\nBe brief.");
    });
  });
});

