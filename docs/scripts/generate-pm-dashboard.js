#!/usr/bin/env node

/**
 * PM Dashboard Generator
 * 
 * Regenerates the PM Dashboard UI HTML file from the JSON data sources.
 * Run this after updating tickets.json or findings-summary.json.
 * 
 * Usage: node docs/scripts/generate-pm-dashboard.js
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(DOCS_DIR, 'data');
const UI_DIR = path.join(DOCS_DIR, 'pm-dashboard-ui');

// Ensure directories exist
if (!fs.existsSync(UI_DIR)) {
  fs.mkdirSync(UI_DIR, { recursive: true });
}

// Read JSON data
const ticketsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'tickets.json'), 'utf8'));
const findingsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'findings-summary.json'), 'utf8'));

// Generate HTML template
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PM Dashboard • Digital Greeter</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #050508;
      --bg-surface: #0c0c12;
      --bg-elevated: #141420;
      --bg-hover: #1c1c2a;
      --text-primary: #f4f4f8;
      --text-secondary: #9090a8;
      --text-muted: #5a5a70;
      --border: #252538;
      --border-subtle: #1a1a28;
      --critical: #ef4444;
      --critical-bg: rgba(239,68,68,0.12);
      --high: #f97316;
      --high-bg: rgba(249,115,22,0.12);
      --medium: #eab308;
      --medium-bg: rgba(234,179,8,0.12);
      --low: #22c55e;
      --low-bg: rgba(34,197,94,0.12);
      --accent: #6366f1;
      --accent-bright: #818cf8;
      --accent-bg: rgba(99,102,241,0.12);
      --success: #10b981;
      --gradient-hero: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
      --gradient-subtle: linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-base);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.5;
      overflow-x: hidden;
    }

    code, .mono { font-family: 'IBM Plex Mono', monospace; }

    ::selection { background: var(--accent); color: white; }

    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg-surface); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    
    .fade-up { animation: fadeUp 0.5s ease-out forwards; opacity: 0; }
    .delay-1 { animation-delay: 0.1s; }
    .delay-2 { animation-delay: 0.2s; }
    .delay-3 { animation-delay: 0.3s; }
    .delay-4 { animation-delay: 0.4s; }
    .delay-5 { animation-delay: 0.5s; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useMemo } = React;

    // ================= DATA (Auto-generated) =================
    const TICKETS_DATA = ${JSON.stringify(ticketsData, null, 2)};
    const FINDINGS_DATA = ${JSON.stringify(findingsData, null, 2)};

    // ================= COMPONENTS =================
    
    function Badge({ color, bg, children }) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.3px',
          color: color,
          background: bg || \`\${color}15\`,
          border: \`1px solid \${color}25\`,
          textTransform: 'uppercase'
        }}>{children}</span>
      );
    }

    function PipelineCard({ title, current, total, subtitle, icon, isComplete, delay }) {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      return (
        <div className={\`fade-up delay-\${delay}\`} style={{ flex: 1, minWidth: '180px' }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '24px',
            height: '100%',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {isComplete && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--success)' }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              <span style={{ fontSize: '18px' }}>{icon}</span>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{title}</span>
            </div>
            <div style={{ fontSize: '40px', fontWeight: 800, marginBottom: '8px', fontFamily: 'IBM Plex Mono', color: isComplete ? 'var(--success)' : 'var(--text-primary)' }}>
              {current}<span style={{ color: 'var(--text-muted)', fontSize: '24px' }}>/{total}</span>
            </div>
            <div style={{ height: '4px', background: 'var(--bg-elevated)', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
              <div style={{ height: '100%', width: \`\${pct}%\`, background: isComplete ? 'var(--success)' : 'var(--gradient-hero)', transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{subtitle}</div>
          </div>
        </div>
      );
    }

    function StatBox({ label, value, color }) {
      return (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{label}</div>
          <div style={{ fontSize: '36px', fontWeight: 800, fontFamily: 'IBM Plex Mono', color: color || 'var(--text-primary)' }}>{value}</div>
        </div>
      );
    }

    function TicketCard({ ticket, onClick }) {
      const priorityColors = {
        critical: { color: 'var(--critical)', bg: 'var(--critical-bg)' },
        high: { color: 'var(--high)', bg: 'var(--high-bg)' },
        medium: { color: 'var(--medium)', bg: 'var(--medium-bg)' },
        low: { color: 'var(--low)', bg: 'var(--low-bg)' }
      };
      const difficultyColors = { easy: 'var(--low)', medium: 'var(--medium)', hard: 'var(--critical)' };
      const p = priorityColors[ticket.priority];
      
      return (
        <div 
          onClick={onClick}
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s ease', borderLeft: \`3px solid \${p.color}\` }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = p.color; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <code style={{ fontSize: '12px', color: p.color }}>{ticket.id}</code>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Badge color={p.color}>{ticket.priority}</Badge>
              <Badge color={difficultyColors[ticket.difficulty]}>{ticket.difficulty}</Badge>
            </div>
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', lineHeight: 1.4 }}>{ticket.title}</h3>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>{ticket.feature}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📁 {ticket.files.length} files</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>✓ {ticket.acceptance_criteria.length} criteria</span>
          </div>
        </div>
      );
    }

    function TicketModal({ ticket, onClose }) {
      if (!ticket) return null;
      const priorityColors = { critical: 'var(--critical)', high: 'var(--high)', medium: 'var(--medium)', low: 'var(--low)' };
      const p = priorityColors[ticket.priority];
      
      return (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '40px', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }}
          onClick={onClose}
        >
          <div 
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '20px', maxWidth: '800px', width: '100%', maxHeight: '85vh', overflow: 'auto', animation: 'scaleIn 0.25s ease' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <code style={{ fontSize: '14px', color: p }}>{ticket.id}</code>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, marginTop: '8px', marginBottom: '12px' }}>{ticket.title}</h2>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Badge color={p}>{ticket.priority}</Badge>
                    <Badge color="var(--text-secondary)">{ticket.difficulty}</Badge>
                    <Badge color="var(--accent)">{ticket.feature}</Badge>
                  </div>
                </div>
                <button onClick={onClose} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px' }}>×</button>
              </div>
            </div>
            <div style={{ padding: '28px' }}>
              <Section title="Issue"><p style={{ color: 'var(--text-primary)', lineHeight: 1.7 }}>{ticket.issue}</p></Section>
              <Section title="Fix Required">
                <ul style={{ paddingLeft: '20px' }}>
                  {ticket.fix_required.map((fix, i) => <li key={i} style={{ color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.6 }}>{fix}</li>)}
                </ul>
              </Section>
              <Section title="Files to Edit">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ticket.files.map((file, i) => <code key={i} style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: '6px', fontSize: '12px', color: 'var(--accent-bright)', border: '1px solid var(--border)' }}>{file}</code>)}
                </div>
              </Section>
              <Section title="Acceptance Criteria">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ticket.acceptance_criteria.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>☐</span>
                      <span style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>{c}</span>
                    </div>
                  ))}
                </div>
              </Section>
              {ticket.risk_notes && ticket.risk_notes.length > 0 && (
                <div style={{ marginTop: '24px', padding: '20px', background: 'var(--critical-bg)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--critical)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>⚠️ Risk Notes</div>
                  <ul style={{ paddingLeft: '20px' }}>
                    {ticket.risk_notes.map((note, i) => <li key={i} style={{ color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.6 }}>{note}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    function Section({ title, children }) {
      return (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px', fontWeight: 600 }}>{title}</div>
          {children}
        </div>
      );
    }

    function FilterButton({ active, onClick, children, color }) {
      return (
        <button onClick={onClick} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: active ? (color ? \`\${color}20\` : 'var(--accent-bg)') : 'transparent', color: active ? (color || 'var(--accent-bright)') : 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.15s ease' }}>{children}</button>
      );
    }

    // ================= MAIN APP =================
    
    function App() {
      const [selectedTicket, setSelectedTicket] = useState(null);
      const [priorityFilter, setPriorityFilter] = useState('all');

      const tickets = TICKETS_DATA.tickets;
      const findings = FINDINGS_DATA;

      const stats = useMemo(() => {
        const byPriority = { critical: 0, high: 0, medium: 0, low: 0 };
        tickets.forEach(t => byPriority[t.priority]++);
        return { byPriority, total: tickets.length };
      }, []);

      const filteredTickets = useMemo(() => {
        if (priorityFilter === 'all') return tickets;
        return tickets.filter(t => t.priority === priorityFilter);
      }, [priorityFilter]);

      const totalAnswered = Object.values(findings.by_priority).reduce((s, p) => s + p.answered, 0);
      const totalPending = Object.values(findings.by_priority).reduce((s, p) => s + p.pending, 0);

      return (
        <div style={{ minHeight: '100vh', background: 'var(--gradient-subtle)' }}>
          <header style={{ padding: '32px 48px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="fade-up">
              <h1 style={{ fontSize: '28px', fontWeight: 800, background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PM Dashboard</h1>
              <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '14px' }}>Digital Greeter • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="fade-up delay-1" style={{ display: 'flex', gap: '12px' }}>
              <div style={{ padding: '8px 16px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tickets: </span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{stats.total}</span>
              </div>
              <div style={{ padding: '8px 16px', background: 'var(--critical-bg)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', fontSize: '13px' }}>
                <span style={{ color: 'var(--critical)' }}>{totalPending} pending findings</span>
              </div>
            </div>
          </header>

          <main style={{ padding: '40px 48px' }}>
            <section style={{ marginBottom: '48px' }}>
              <h2 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px', fontWeight: 600 }}>Pipeline Status</h2>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <PipelineCard title="Documented" icon="📝" current={findings.meta.total_features} total={findings.meta.total_features} subtitle="Features documented" isComplete={true} delay={1} />
                <PipelineCard title="Reviewed" icon="🔍" current={findings.meta.reviewed_features} total={findings.meta.total_features} subtitle="Features reviewed" isComplete={true} delay={2} />
                <PipelineCard title="Triaged" icon="📋" current={totalAnswered} total={findings.meta.total_findings} subtitle={\`\${totalPending} pending\`} isComplete={totalPending === 0} delay={3} />
                <PipelineCard title="Ticketed" icon="🎫" current={stats.total} total={stats.total} subtitle="Ready for dev" isComplete={true} delay={4} />
                <PipelineCard title="In Progress" icon="🔨" current={0} total={stats.total} subtitle="Being developed" isComplete={false} delay={5} />
              </div>
            </section>

            <section className="fade-up delay-3" style={{ marginBottom: '48px' }}>
              <h2 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px', fontWeight: 600 }}>Tickets by Priority</h2>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <StatBox label="Critical" value={stats.byPriority.critical} color="var(--critical)" />
                <StatBox label="High" value={stats.byPriority.high} color="var(--high)" />
                <StatBox label="Medium" value={stats.byPriority.medium} color="var(--medium)" />
                <StatBox label="Low" value={stats.byPriority.low} color="var(--low)" />
                <StatBox label="Total" value={stats.total} />
              </div>
            </section>

            <section className="fade-up delay-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Tickets ({filteredTickets.length})</h2>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <FilterButton active={priorityFilter === 'all'} onClick={() => setPriorityFilter('all')}>All</FilterButton>
                  <FilterButton active={priorityFilter === 'critical'} onClick={() => setPriorityFilter('critical')} color="var(--critical)">🔴 Critical</FilterButton>
                  <FilterButton active={priorityFilter === 'high'} onClick={() => setPriorityFilter('high')} color="var(--high)">🟠 High</FilterButton>
                  <FilterButton active={priorityFilter === 'medium'} onClick={() => setPriorityFilter('medium')} color="var(--medium)">🟡 Medium</FilterButton>
                  <FilterButton active={priorityFilter === 'low'} onClick={() => setPriorityFilter('low')} color="var(--low)">🟢 Low</FilterButton>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                {filteredTickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} onClick={() => setSelectedTicket(ticket)} />)}
              </div>
            </section>
          </main>

          {selectedTicket && <TicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>`;

// Write the HTML file
fs.writeFileSync(path.join(UI_DIR, 'index.html'), html);

console.log('✅ PM Dashboard UI regenerated successfully!');
console.log(`   📁 ${path.join(UI_DIR, 'index.html')}`);
console.log('');
console.log('To view: Open the HTML file in your browser');
console.log('   open docs/pm-dashboard-ui/index.html');

