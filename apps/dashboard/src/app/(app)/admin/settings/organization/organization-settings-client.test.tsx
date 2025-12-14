/**
 * @vitest-environment jsdom
 *
 * OrganizationSettingsClient Tests
 *
 * Behaviors Tested:
 * 1. Display - Shows organization name input with current value
 * 2. Display - Shows email input with current value
 * 3. Display - Shows phone input with current value
 * 4. Display - Shows logo preview when logo_url exists
 * 5. Display - Shows placeholder icon when no logo
 * 6. Display - Shows success alert after save
 * 7. Display - Shows error alert on failure
 * 8. Display - Shows email confirmation warning when email changed
 * 9. Actions - Save button disabled when no changes
 * 10. Actions - Save button enabled when changes made
 * 11. Actions - Shows loading state during save
 * 12. Logo Upload - Validates file type
 * 13. Logo Upload - Validates file size (max 2MB)
 * 14. Logo Upload - Shows uploading state
 * 15. Logo Remove - Can remove logo with confirm
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  Building2: () => <div data-testid="building2-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  Trash2: () => <div data-testid="trash2-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Eye: () => <div data-testid="eye-icon" />, // TKT-009: co-browse setting
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Supabase client
const mockFrom = vi.fn();
const mockStorage = {
  from: vi.fn(() => ({
    upload: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/logo.png" } })),
  })),
};
const mockAuth = {
  updateUser: vi.fn().mockResolvedValue({ error: null }),
};
const mockSupabase = {
  from: mockFrom,
  storage: mockStorage,
  auth: mockAuth,
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

import { OrganizationSettingsClient } from "./organization-settings-client";
import type { Organization, User } from "@ghost-greeter/domain/database.types";

describe("OrganizationSettingsClient", () => {
  const defaultOrganization: Organization = {
    id: "org-123",
    name: "Test Organization",
    logo_url: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: "active",
    blocked_countries: [],
    country_list_mode: "blocklist",
    recording_settings: {
      enabled: false,
      retention_days: 30,
      transcription_enabled: false,
      ai_summary_enabled: false,
      ai_summary_prompt_format: null,
    },
    billing_frequency: "monthly",
    purchased_seats: 1,
    has_six_month_offer: false,
    pause_ends_at: null,
    facebook_settings: null,
    default_widget_settings: {
      size: "medium",
      position: "bottom-right",
      devices: "all",
      trigger_delay: 3,
      auto_hide_delay: null,
      show_minimize_button: false,
      theme: "dark",
      cobrowse_enabled: true, // TKT-009
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const defaultUser: User = {
    id: "user-123",
    email: "test@example.com",
    full_name: "Test User",
    avatar_url: null,
    phone: "555-1234",
    organization_id: "org-123",
    role: "owner",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const defaultProps = {
    organization: defaultOrganization,
    user: defaultUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock setup for successful operations
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
    it("shows page title 'Organization Settings'", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      expect(screen.getByText("Organization Settings")).toBeInTheDocument();
    });

    it("shows back link to settings page", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      const backLink = screen.getByText("Back to Settings");
      expect(backLink.closest("a")).toHaveAttribute("href", "/admin/settings");
    });

    it("shows subtitle about managing organization profile", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Manage your organization's profile and branding/)).toBeInTheDocument();
    });
  });

  describe("Display - Organization Name", () => {
    it("shows organization name input with current value", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      const input = screen.getByDisplayValue("Test Organization");
      expect(input).toBeInTheDocument();
    });

    it("shows 'Organization Name' label", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      expect(screen.getByText("Organization Name")).toBeInTheDocument();
    });
  });

  describe("Display - Email", () => {
    it("shows email input with current value", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      const input = screen.getByDisplayValue("test@example.com");
      expect(input).toBeInTheDocument();
    });

    it("shows 'Email Address' label", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      expect(screen.getByText("Email Address")).toBeInTheDocument();
    });

    it("shows email confirmation warning when email is changed", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      const input = screen.getByDisplayValue("test@example.com");
      fireEvent.change(input, { target: { value: "new@example.com" } });

      expect(screen.getByText(/Changing your email will require confirmation/)).toBeInTheDocument();
    });

    it("does not show email warning when email unchanged", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      expect(screen.queryByText(/Changing your email will require confirmation/)).not.toBeInTheDocument();
    });
  });

  describe("Display - Phone", () => {
    it("shows phone input with current value", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      const input = screen.getByDisplayValue("555-1234");
      expect(input).toBeInTheDocument();
    });

    it("shows 'Phone Number' label", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      expect(screen.getByText("Phone Number")).toBeInTheDocument();
    });

    it("shows empty phone input when user has no phone", () => {
      const userWithoutPhone = { ...defaultUser, phone: null };
      render(
        <OrganizationSettingsClient
          organization={defaultOrganization}
          user={userWithoutPhone}
        />
      );

      const phoneInput = screen.getByPlaceholderText("(555) 123-4567");
      expect(phoneInput).toHaveValue("");
    });
  });

  describe("Display - Logo", () => {
    it("shows placeholder icon when no logo_url", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      // Building2 icon should be in the logo preview area
      const building2Icons = screen.getAllByTestId("building2-icon");
      expect(building2Icons.length).toBeGreaterThan(0);
    });

    it("shows logo image when logo_url exists", () => {
      const orgWithLogo = {
        ...defaultOrganization,
        logo_url: "https://example.com/logo.png",
      };
      render(
        <OrganizationSettingsClient
          organization={orgWithLogo}
          user={defaultUser}
        />
      );

      const logoImg = screen.getByAltText("Organization logo");
      expect(logoImg).toHaveAttribute("src", "https://example.com/logo.png");
    });

    it("shows 'Upload Logo' button", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      expect(screen.getByText("Upload Logo")).toBeInTheDocument();
    });

    it("shows 'Remove' button only when logo exists", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);
      expect(screen.queryByText("Remove")).not.toBeInTheDocument();

      const orgWithLogo = {
        ...defaultOrganization,
        logo_url: "https://example.com/logo.png",
      };
      const { rerender } = render(
        <OrganizationSettingsClient
          organization={orgWithLogo}
          user={defaultUser}
        />
      );
      expect(screen.getByText("Remove")).toBeInTheDocument();
    });

    it("shows file size recommendation", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Recommended: Square image, at least 200x200 pixels/)).toBeInTheDocument();
      expect(screen.getByText(/Max file size: 2MB/)).toBeInTheDocument();
    });
  });

  describe("Display - Sections", () => {
    it("shows 'Organization Logo' section heading", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      expect(screen.getByText("Organization Logo")).toBeInTheDocument();
    });

    it("shows 'Basic Information' section heading", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      expect(screen.getByText("Basic Information")).toBeInTheDocument();
    });

    it("shows 'Account Owner' section heading", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      expect(screen.getByText("Account Owner")).toBeInTheDocument();
    });

    it("shows info box at the bottom", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      expect(screen.getByText("💡 Organization Settings")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // SAVE BUTTON BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Save Button State", () => {
    it("Save button is disabled when no changes made", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });

    it("Save button is enabled when organization name changed", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      const nameInput = screen.getByDisplayValue("Test Organization");
      fireEvent.change(nameInput, { target: { value: "New Org Name" } });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      expect(saveButton).not.toBeDisabled();
    });

    it("Save button is enabled when email changed", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      const emailInput = screen.getByDisplayValue("test@example.com");
      fireEvent.change(emailInput, { target: { value: "new@example.com" } });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      expect(saveButton).not.toBeDisabled();
    });

    it("Save button is enabled when phone changed", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      const phoneInput = screen.getByDisplayValue("555-1234");
      fireEvent.change(phoneInput, { target: { value: "555-9999" } });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      expect(saveButton).not.toBeDisabled();
    });

    it("Save button becomes disabled when change is reverted", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      const nameInput = screen.getByDisplayValue("Test Organization");
      fireEvent.change(nameInput, { target: { value: "New Name" } });

      let saveButton = screen.getByRole("button", { name: /save changes/i });
      expect(saveButton).not.toBeDisabled();

      fireEvent.change(nameInput, { target: { value: "Test Organization" } });

      saveButton = screen.getByRole("button", { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // SAVE ACTION BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Save Actions", () => {
    it("shows loading state during save", async () => {
      // Create a promise that won't resolve immediately
      let resolveUpdate: () => void;
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(() => new Promise((resolve) => {
            resolveUpdate = () => resolve({ error: null });
          })),
        }),
      });

      render(<OrganizationSettingsClient {...defaultProps} />);

      const nameInput = screen.getByDisplayValue("Test Organization");
      fireEvent.change(nameInput, { target: { value: "New Name" } });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Saving...")).toBeInTheDocument();
      });

      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();

      resolveUpdate!();
    });

    it("calls supabase to update org name when name changed", async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValue({ update: mockUpdate });

      render(<OrganizationSettingsClient {...defaultProps} />);

      const nameInput = screen.getByDisplayValue("Test Organization");
      fireEvent.change(nameInput, { target: { value: "New Org Name" } });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("organizations");
        expect(mockUpdate).toHaveBeenCalledWith({ name: "New Org Name" });
      });
    });

    it("shows success message after successful save", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      render(<OrganizationSettingsClient {...defaultProps} />);

      const nameInput = screen.getByDisplayValue("Test Organization");
      fireEvent.change(nameInput, { target: { value: "New Name" } });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Changes saved successfully")).toBeInTheDocument();
      });

      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    });

    it("shows special message when email is changed", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      mockAuth.updateUser.mockResolvedValue({ error: null });

      render(<OrganizationSettingsClient {...defaultProps} />);

      const emailInput = screen.getByDisplayValue("test@example.com");
      fireEvent.change(emailInput, { target: { value: "new@example.com" } });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("A confirmation email has been sent to your new email address")).toBeInTheDocument();
      });
    });

    it("shows error message when save fails", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "Update failed" } }),
        }),
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<OrganizationSettingsClient {...defaultProps} />);

      const nameInput = screen.getByDisplayValue("Test Organization");
      fireEvent.change(nameInput, { target: { value: "New Name" } });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to save changes. Please try again.")).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it("calls supabase auth and users table when email changed", async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValue({ update: mockUpdate });
      mockAuth.updateUser.mockResolvedValue({ error: null });

      render(<OrganizationSettingsClient {...defaultProps} />);

      const emailInput = screen.getByDisplayValue("test@example.com");
      fireEvent.change(emailInput, { target: { value: "new@example.com" } });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockAuth.updateUser).toHaveBeenCalledWith({ email: "new@example.com" });
        expect(mockFrom).toHaveBeenCalledWith("users");
      });
    });

    it("trims whitespace from inputs before saving", async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValue({ update: mockUpdate });

      render(<OrganizationSettingsClient {...defaultProps} />);

      const nameInput = screen.getByDisplayValue("Test Organization");
      fireEvent.change(nameInput, { target: { value: "  New Name  " } });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ name: "New Name" });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // LOGO UPLOAD BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Logo Upload", () => {
    it("accepts image files", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute("accept", "image/*");
    });

    it("shows error for non-image files", async () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const nonImageFile = new File(["content"], "document.pdf", { type: "application/pdf" });

      fireEvent.change(fileInput, { target: { files: [nonImageFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Please upload an image file/)).toBeInTheDocument();
      });
    });

    it("shows error for files over 2MB", async () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      // Create a file larger than 2MB
      const largeContent = new Array(3 * 1024 * 1024).fill("a").join("");
      const largeFile = new File([largeContent], "large-image.png", { type: "image/png" });

      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Logo must be less than 2MB/)).toBeInTheDocument();
      });
    });

    it("shows uploading state during upload", async () => {
      let resolveUpload: () => void;
      mockStorage.from.mockReturnValue({
        upload: vi.fn().mockImplementation(() => new Promise((resolve) => {
          resolveUpload = () => resolve({ error: null });
        })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/logo.png" } })),
      });

      render(<OrganizationSettingsClient {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const imageFile = new File(["image-content"], "logo.png", { type: "image/png" });

      fireEvent.change(fileInput, { target: { files: [imageFile] } });

      await waitFor(() => {
        expect(screen.getByText("Uploading...")).toBeInTheDocument();
      });

      resolveUpload!();
    });

    it("uploads to supabase storage with correct path", async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      mockStorage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/logo.png" } })),
      });
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      render(<OrganizationSettingsClient {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const imageFile = new File(["image-content"], "logo.png", { type: "image/png" });

      fireEvent.change(fileInput, { target: { files: [imageFile] } });

      await waitFor(() => {
        expect(mockStorage.from).toHaveBeenCalledWith("logos");
        expect(mockUpload).toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // LOGO REMOVE BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Logo Remove", () => {
    it("shows confirm dialog when clicking Remove", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      const orgWithLogo = {
        ...defaultOrganization,
        logo_url: "https://example.com/logo.png",
      };
      render(
        <OrganizationSettingsClient
          organization={orgWithLogo}
          user={defaultUser}
        />
      );

      const removeButton = screen.getByText("Remove");
      fireEvent.click(removeButton);

      expect(confirmSpy).toHaveBeenCalledWith("Are you sure you want to remove the organization logo?");

      confirmSpy.mockRestore();
    });

    it("does not remove logo if user cancels confirm", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);

      const orgWithLogo = {
        ...defaultOrganization,
        logo_url: "https://example.com/logo.png",
      };
      render(
        <OrganizationSettingsClient
          organization={orgWithLogo}
          user={defaultUser}
        />
      );

      const removeButton = screen.getByText("Remove");
      fireEvent.click(removeButton);

      // Logo should still be displayed
      expect(screen.getByAltText("Organization logo")).toBeInTheDocument();
    });

    it("removes logo when user confirms", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const orgWithLogo = {
        ...defaultOrganization,
        logo_url: "https://example.com/logo.png",
      };
      render(
        <OrganizationSettingsClient
          organization={orgWithLogo}
          user={defaultUser}
        />
      );

      const removeButton = screen.getByText("Remove");
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("organizations");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles user with no phone gracefully", () => {
      const userWithoutPhone = { ...defaultUser, phone: null };
      render(
        <OrganizationSettingsClient
          organization={defaultOrganization}
          user={userWithoutPhone}
        />
      );

      const phoneInput = screen.getByPlaceholderText("(555) 123-4567");
      expect(phoneInput).toHaveValue("");

      // Can still add a phone number
      fireEvent.change(phoneInput, { target: { value: "555-9999" } });
      expect(screen.getByRole("button", { name: /save changes/i })).not.toBeDisabled();
    });

    it("handles clearing phone number", () => {
      render(<OrganizationSettingsClient {...defaultProps} />);

      const phoneInput = screen.getByDisplayValue("555-1234");
      fireEvent.change(phoneInput, { target: { value: "" } });

      expect(screen.getByRole("button", { name: /save changes/i })).not.toBeDisabled();
    });

    it("handles organization name with special characters", async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValue({ update: mockUpdate });

      render(<OrganizationSettingsClient {...defaultProps} />);

      const nameInput = screen.getByDisplayValue("Test Organization");
      fireEvent.change(nameInput, { target: { value: "O'Reilly & Sons (LLC)" } });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ name: "O'Reilly & Sons (LLC)" });
      });
    });
  });
});




