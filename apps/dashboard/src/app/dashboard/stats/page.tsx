import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { BarChart3, TrendingUp, Clock, Phone } from "lucide-react";

export default async function StatsPage() {
  const auth = await getCurrentUser();

  if (!auth) {
    redirect("/login");
  }

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-8 py-4">
          <h1 className="text-2xl font-bold">Stats</h1>
          <p className="text-muted-foreground">
            Track your performance and call metrics
          </p>
        </div>
      </header>

      <div className="p-8">
        {/* Coming Soon Placeholder */}
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Stats Dashboard Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            We're building a comprehensive analytics dashboard to help you track your performance, 
            call history, and visitor engagement metrics.
          </p>
          
          {/* Preview of upcoming features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="p-4 rounded-xl bg-muted/30 border border-border">
              <Phone className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm font-medium">Call History</div>
              <div className="text-xs text-muted-foreground">View past calls</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border">
              <TrendingUp className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm font-medium">Performance</div>
              <div className="text-xs text-muted-foreground">Track trends</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border">
              <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm font-medium">Time Metrics</div>
              <div className="text-xs text-muted-foreground">Response times</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

