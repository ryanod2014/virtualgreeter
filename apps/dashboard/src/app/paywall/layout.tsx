"use client";

import { Logo } from "@/lib/components/logo";

export default function PaywallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background dark relative overflow-hidden">
      {/* Background effects - matching landing page */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="glow-orb w-[600px] h-[600px] -top-[300px] left-1/2 -translate-x-1/2 bg-primary/15" />
        <div className="glow-orb w-[400px] h-[400px] top-[60%] -left-[150px] bg-purple-600/10" />
        <div className="glow-orb w-[350px] h-[350px] top-[40%] -right-[100px] bg-fuchsia-600/8" />
      </div>

      {/* Grid pattern */}
      <div className="fixed inset-0 grid-pattern pointer-events-none" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="container mx-auto px-6 py-5">
          <nav className="flex items-center justify-center">
            <Logo size="md" />
          </nav>
        </header>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          {children}
        </main>
      </div>
    </div>
  );
}

