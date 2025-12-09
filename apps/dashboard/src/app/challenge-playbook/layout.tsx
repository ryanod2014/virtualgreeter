import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Challenge Playbook | Tony Robbins & Dean Graziosi",
  description: "Get Tony Robbins & Dean Graziosi's Internal Playbook For Running Virtual Events For $27",
};

export default function ChallengePlaybookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
