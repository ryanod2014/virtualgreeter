"use client";

import { useState } from "react";
import { Copy, Check, Code, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";

interface Props {
  organizationId: string;
}

export function SiteSetupClient({ organizationId }: Props) {
  const [copiedCode, setCopiedCode] = useState(false);

  const embedCode = `<!-- Ghost-Greeter Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['GhostGreeter']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','gg','https://cdn.ghost-greeter.com/widget.js'));
  gg('init', { orgId: '${organizationId}' });
</script>`;

  const copyEmbedCode = async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Embed Code</h1>
        <p className="text-muted-foreground">
          Add the widget to your website in seconds
        </p>
      </div>

      {/* Main Embed Code Card */}
      <div className="glass rounded-2xl p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Code className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Your Widget Code</h2>
            <p className="text-sm text-muted-foreground">Works on any website</p>
          </div>
        </div>

        {/* Code Block */}
        <div className="relative mb-6">
          <pre className="p-5 rounded-xl bg-[#0d1117] text-[#c9d1d9] font-mono text-sm overflow-x-auto whitespace-pre-wrap border border-[#30363d]">
            {embedCode}
          </pre>
          <button
            onClick={copyEmbedCode}
            className={`absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              copiedCode 
                ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
            }`}
          >
            {copiedCode ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Code
              </>
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Where to add it</h3>
          
          <div className="grid gap-3">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">
                1
              </div>
              <div>
                <div className="font-medium">Copy the code above</div>
                <div className="text-sm text-muted-foreground">
                  Click the "Copy Code" button
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">
                2
              </div>
              <div>
                <div className="font-medium">
                  Paste before the closing <code className="px-1.5 py-0.5 rounded bg-background font-mono text-xs">&lt;/body&gt;</code> tag
                </div>
                <div className="text-sm text-muted-foreground">
                  Add it to every page where you want the widget to appear
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">
                3
              </div>
              <div>
                <div className="font-medium">That's it!</div>
                <div className="text-sm text-muted-foreground">
                  The widget will appear on your site when agents are online
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Routing CTA */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Want different agents on different pages?</h3>
              <p className="text-sm text-muted-foreground">
                Use Agent Pools to show your sales team on pricing pages, support on help pages, etc.
              </p>
            </div>
          </div>
          <Link
            href="/admin/pools"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
          >
            Configure Pools
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
