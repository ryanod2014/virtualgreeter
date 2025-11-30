import Link from "next/link";
import {
  Zap,
  Users,
  Video,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/lib/components/logo";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-purple-900/10" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-6 py-6">
          <nav className="flex items-center justify-between">
            <Logo size="md" />
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero */}
        <main className="container mx-auto px-6 pt-24 pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                The future of visitor engagement
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Turn every visitor into a
              <span className="gradient-text"> live conversation</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              GreetNow creates the illusion of a live video presence for
              every visitor. When they engage, you connect instantly via WebRTC.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="group bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all flex items-center gap-2"
              >
                Launch Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#demo"
                className="glass px-8 py-4 rounded-xl font-semibold text-lg hover:bg-muted/50 transition-all"
              >
                Watch Demo
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mt-32 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="glass rounded-2xl p-8 group hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Simulated Live Video</h3>
              <p className="text-muted-foreground">
                Pre-recorded intro hooks visitors, then seamlessly loops to
                simulate a live presence. They think you're there.
              </p>
            </div>

            <div className="glass rounded-2xl p-8 group hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant WebRTC Connect</h3>
              <p className="text-muted-foreground">
                When visitors click "Accept," the pre-recorded video cuts and
                you join live via peer-to-peer video in milliseconds.
              </p>
            </div>

            <div className="glass rounded-2xl p-8 group hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Elastic Agent Pooling</h3>
              <p className="text-muted-foreground">
                One agent broadcasts to 100+ visitors. When busy, visitors
                seamlessly switch to available agents.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

