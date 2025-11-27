import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import Link from "next/link";
import {
  Building2,
  CreditCard,
  ChevronRight,
  Video,
} from "lucide-react";

export default async function SettingsPage() {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");
  if (!auth.isAdmin) redirect("/dashboard");

  // Settings page - updated
  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization settings and preferences
        </p>
      </div>

      {/* Settings Grid */}
      <div className="space-y-4">
        <SettingsCard
          href="/admin/settings/organization"
          icon={Building2}
          title="Organization"
          description="Update your organization name, logo, and details"
          color="blue"
        />

        <SettingsCard
          href="/admin/settings/recordings"
          icon={Video}
          title="Call Recording"
          description="Enable call recording and set retention policies"
          color="red"
        />

        <SettingsCard
          href="#"
          icon={CreditCard}
          title="Billing"
          description="Manage your subscription and payment methods"
          color="amber"
          disabled
          comingSoon
        />
      </div>
    </div>
  );
}

function SettingsCard({
  href,
  icon: Icon,
  title,
  description,
  color,
  disabled,
  comingSoon,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: "purple" | "blue" | "green" | "amber" | "red";
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  const colorClasses = {
    purple: "text-purple-500 bg-purple-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    green: "text-green-500 bg-green-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    red: "text-red-500 bg-red-500/10",
  };

  const content = (
    <div
      className={`glass rounded-2xl p-6 flex items-center justify-between transition-colors ${
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:bg-muted/30 cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{title}</h3>
            {comingSoon && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                Coming Soon
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      {!disabled && (
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      )}
    </div>
  );

  if (disabled) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

