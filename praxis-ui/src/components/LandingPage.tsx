import { useEffect, useRef, useState } from "react";

// ── Constants ──────────────────────────────────────────────────────────────────

const PIPELINE_LOG: Array<{ text: string; color: "dim" | "green" | "red" | "cyan" | "amber" }> = [
  { text: "[14:02:09] BUILD FAILURE — INC-4821 · payment-service", color: "red" },
  { text: "[14:02:11] Alert received. Initializing Coordinator Agent...", color: "dim" },
  { text: "[14:02:14] MCP Filesystem → server.log (1,626 chars)", color: "dim" },
  { text: "[14:02:19] Auto-Fix Loop  attempt 1/3", color: "dim" },
  { text: "[14:02:24] Coordinator complete — patch generated", color: "dim" },
  { text: "[14:02:27] Security Critic → rating=RISKY", color: "amber" },
  { text: "[14:02:27] Passing critique to Coordinator (attempt 2)", color: "dim" },
  { text: "[14:02:32] Security Critic → rating=SECURE ✓", color: "green" },
  { text: "[14:02:33] QA Agent → generating Playwright regression test", color: "cyan" },
  { text: "[14:02:38] tests/auth.spec.ts generated (2,847 chars)", color: "cyan" },
  { text: "[14:02:39] Committing to GitLab: fix-incident-1778640291034", color: "dim" },
  { text: "[14:02:41] Merge Request !42 opened ↗", color: "dim" },
  { text: "[14:02:42] Slack alert dispatched → #devops-alerts", color: "dim" },
  { text: "[14:02:42] ✓ RESOLVED in 33s — zero human intervention", color: "green" },
];

const LINE_COLOR: Record<string, string> = {
  green: "#00FF6A",
  red:   "#FF6B6B",
  cyan:  "#00D4FF",
  amber: "#F59E0B",
  dim:   "rgba(255,255,255,0.28)",
};

const FEATURES = [
  {
    index: "01",
    glyph: "⚔",
    title: "Multi-Agent Debate",
    body:  "Coordinator vs. Security Critic. Two adversarial Gemini agents debate every patch before it touches production. The Critic catches what the Coordinator misses.",
    accent: "#00D4FF",
  },
  {
    index: "02",
    glyph: "⚡",
    title: "Slack ChatOps",
    body:  "One-click GitLab merges from your phone. Approve or rollback entire merge requests directly from Slack. No VPN. No terminal. No context-switching.",
    accent: "#00FF6A",
  },
  {
    index: "03",
    glyph: "◈",
    title: "Pre-Crime Patching",
    body:  "Telemetry-driven predictive healing. Praxis intercepts latency spikes and deploys defensive patches before your p99 flatlines. Fix crashes before they happen.",
    accent: "#F59E0B",
  },
];

const STATS = [
  { value: "<30s",  label: "Mean Time to Patch"           },
  { value: "3",     label: "Concurrent AI Agents"          },
  { value: "100%",  label: "Regression Tests Generated"    },
  { value: "0",     label: "Manual Interventions Required" },
];

const SLACK_CHAOS = [
  { user: "sarah_k",  time: "3:41 AM", text: "@here 500 errors spiking on payment-service 🚨", dot: "#EF4444" },
  { user: "mike_t",   time: "3:43 AM", text: "who changed the DB schema? checking logs now", dot: "#8B5CF6" },
  { user: "alex_r",   time: "3:44 AM", text: "has anyone checked CloudWatch yet??", dot: "#F59E0B" },
  { user: "sarah_k",  time: "3:46 AM", text: "rolling back now. sorry everyone", dot: "#EF4444" },
];

const PRAXIS_STEPS = [
  { text: "INC-4821 detected — telemetry alert received",         done: true },
  { text: "Governance Board cleared — Security · FinOps · Arch",  done: true },
  { text: "QA Agent generated Playwright regression suite",        done: true },
  { text: "MR !42 merged via ChatOps approval",                   done: true },
  { text: "Runbook committed → docs/incidents/INC-4821.md",       done: true },
];

const TIMELINE_STEPS = [
  {
    n: "01",
    title: "Telemetry Interception",
    desc: "Datadog latency spikes or GitLab CI failures trigger Praxis instantly. Pre-Crime mode fires pre-emptive patches before a crash ever occurs.",
    accent: "#00D4FF",
    tag: "PRE-CRIME · CRASH",
  },
  {
    n: "02",
    title: "Multi-Agent Debate",
    desc: "Coordinator generates a patch. Security, FinOps, and Architecture Critics audit concurrently via Promise.all. All three must clear it.",
    accent: "#00FF6A",
    tag: "GOVERNANCE BOARD",
  },
  {
    n: "03",
    title: "Zero-Debt QA",
    desc: "A dedicated QA Agent writes Playwright regression tests for every patch before it touches main — eliminating the test coverage gap.",
    accent: "#F59E0B",
    tag: "PLAYWRIGHT",
  },
  {
    n: "04",
    title: "ChatOps Execution",
    desc: "One-click GitLab merge from Slack. Post-mortem committed automatically. Resolution embedded into Vector Memory for future incidents.",
    accent: "#A78BFA",
    tag: "HUMAN-IN-THE-LOOP",
  },
];

// ── Scroll-visibility hook ─────────────────────────────────────────────────────

function useScrollVisible(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.unobserve(el);
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, visible] as const;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface LandingPageProps {
  onEnterDashboard: () => void;
}

// ── LandingPage ────────────────────────────────────────────────────────────────

export function LandingPage({ onEnterDashboard }: LandingPageProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [logCycle,     setLogCycle]     = useState(0);
  const [mounted,      setMounted]      = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (visibleLines < PIPELINE_LOG.length) {
      const t = setTimeout(() => setVisibleLines((v) => v + 1), 260);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setVisibleLines(0);
      setLogCycle((c) => c + 1);
    }, 3200);
    return () => clearTimeout(t);
  }, [visibleLines, logCycle]);

  const fade = (delay: number) => ({
    opacity:    mounted ? 1 : 0,
    transform:  mounted ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.65s ${delay}s, transform 0.65s ${delay}s`,
  });

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "#050507", color: "#E0E0E0", fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {/* Background aurora */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          background: "radial-gradient(ellipse 900px 500px at 50% -100px, rgba(0,190,255,0.07) 0%, transparent 70%)",
        }}
      />
      {/* Grid overlay */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Nav ── */}
      <nav
        className="relative flex items-center justify-between px-8 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", zIndex: 10 }}
      >
        <div className="flex items-center gap-3">
          <span
            style={{
              display: "inline-block", width: 8, height: 8, borderRadius: "50%",
              background: "#00FF6A", boxShadow: "0 0 8px #00FF6A",
              animation: "pulse-dot 2s ease-in-out infinite",
            }}
          />
          <span style={{ fontSize: 13, letterSpacing: "0.3em", color: "rgba(255,255,255,0.85)" }}>PRAXIS</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.1)", padding: "1px 8px", letterSpacing: "0.15em" }}>
            v2.1
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {[
            { label: "Docs",   href: "https://github.com/AnishPatel526/Praxis#readme" },
            { label: "GitHub", href: "https://github.com/AnishPatel526/Praxis" },
          ].map(({ label, href }) => (
            <a
              key={label} href={href} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
            >
              {label}
            </a>
          ))}
          <button
            onClick={onEnterDashboard}
            style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.15)", padding: "7px 16px", color: "rgba(255,255,255,0.55)", background: "transparent", cursor: "pointer", transition: "border-color 0.2s, color 0.2s", fontFamily: "inherit" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,255,106,0.5)"; e.currentTarget.style.color = "#00FF6A"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
          >
            Enter Dashboard →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        style={{ position: "relative", zIndex: 10, maxWidth: 1280, margin: "0 auto", padding: "80px 32px 64px", display: "flex", alignItems: "flex-start", gap: 56 }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ ...fade(0.1), display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 36 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(0,212,255,0.2)", background: "rgba(0,212,255,0.04)", padding: "5px 12px", fontSize: 10, letterSpacing: "0.4em", color: "#00D4FF", textTransform: "uppercase" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00D4FF", boxShadow: "0 0 6px #00D4FF", flexShrink: 0, animation: "pulse-dot 2s ease-in-out infinite" }} />
              Autonomous Pipeline Intelligence
            </span>
          </div>
          <h1
            style={{ ...fade(0.2), fontSize: 68, fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.02em", marginBottom: 24, background: "linear-gradient(140deg, #ffffff 30%, rgba(0,212,255,0.85) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
          >
            Zero-Touch<br />Pipeline<br />Resolution.
          </h1>
          <p style={{ ...fade(0.35), fontSize: 13, lineHeight: 1.75, color: "rgba(255,255,255,0.38)", maxWidth: 440, marginBottom: 40 }}>
            Praxis is an autonomous, multi-agent CI/CD platform that predicts crashes,
            synthesizes patches, and writes regression tests before your pager even goes off.
          </p>
          <div style={{ ...fade(0.48), display: "flex", gap: 12 }}>
            <button
              onClick={onEnterDashboard}
              style={{ background: "#00FF6A", color: "#050507", border: "none", padding: "12px 28px", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Enter Dashboard
            </button>
            <a
              href="https://github.com/AnishPatel526/Praxis#readme" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.15)", padding: "12px 28px", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", textDecoration: "none", transition: "border-color 0.2s, color 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
            >
              View Documentation
            </a>
          </div>
        </div>

        {/* Terminal */}
        <div style={{ ...fade(0.55), flexShrink: 0, width: 460, border: "1px solid rgba(255,255,255,0.07)", background: "#08080C", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#0D0D12" }}>
            {["#FF5F57", "#FFBD2E", "#28C840"].map((c) => (
              <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }} />
            ))}
            <span style={{ marginLeft: 6, fontSize: 10, color: "rgba(255,255,255,0.18)", letterSpacing: "0.25em" }}>praxis — live pipeline</span>
          </div>
          <div style={{ padding: "14px 16px", height: 260, overflow: "hidden", fontSize: 11, lineHeight: 1.7 }}>
            {PIPELINE_LOG.slice(0, visibleLines).map((line, i) => (
              <div key={`${logCycle}-${i}`} style={{ color: LINE_COLOR[line.color], animation: "fadeInLog 0.12s ease-out" }}>
                {line.text}
              </div>
            ))}
            {visibleLines < PIPELINE_LOG.length && (
              <span style={{ color: "rgba(255,255,255,0.4)", animation: "blink 1s step-end infinite" }}>▋</span>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div style={{ ...fade(0.7), borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", position: "relative", zIndex: 10 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 32px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ padding: "16px 24px", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: "0.3em", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature Grid ── */}
      <section style={{ position: "relative", zIndex: 10, maxWidth: 1280, margin: "0 auto", padding: "64px 32px 72px" }}>
        <div style={{ ...fade(0.85), fontSize: 10, letterSpacing: "0.45em", color: "rgba(255,255,255,0.18)", textTransform: "uppercase", marginBottom: 36 }}>
          {"// CAPABILITIES"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)" }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.index} feature={f} delay={0.9 + i * 0.1} mounted={mounted} />
          ))}
        </div>
      </section>

      {/* ── Section divider ── */}
      <SectionDivider />

      {/* ── SRE Reality ── */}
      <SreRealitySection />

      {/* ── Bento Box ── */}
      <BentoSection />

      {/* ── Architecture Timeline ── */}
      <TimelineSection />

      {/* ── Footer ── */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.05)", padding: "24px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FF6A", display: "inline-block" }} />
            <span style={{ fontSize: 10, letterSpacing: "0.3em", color: "rgba(255,255,255,0.18)", textTransform: "uppercase" }}>PRAXIS</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", letterSpacing: "0.2em", marginRight: 4 }}>Powered by</span>
            {["Google Cloud", "Vertex AI", "Gemini 2.5 Pro", "GitLab", "Playwright"].map((tech) => (
              <TechBadge key={tech} label={tech} />
            ))}
          </div>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.1)", letterSpacing: "0.2em" }}>© 2025 PRAXIS SYSTEMS</span>
        </div>
      </footer>

      <style>{`
        @keyframes fadeInLog {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1;   box-shadow: 0 0 6px currentColor; }
          50%       { opacity: 0.5; box-shadow: 0 0 12px currentColor; }
        }
        @keyframes scroll-fade-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer-line {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function SectionDivider() {
  return (
    <div
      aria-hidden
      style={{
        position: "relative", zIndex: 10,
        height: 1,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 30%, rgba(0,212,255,0.15) 50%, rgba(255,255,255,0.06) 70%, transparent 100%)",
      }}
    />
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: "0.45em", color: "rgba(255,255,255,0.18)", textTransform: "uppercase", marginBottom: 20 }}>
      {text}
    </div>
  );
}

// ── SRE Reality Section ────────────────────────────────────────────────────────

function SreRealitySection() {
  const [ref, visible] = useScrollVisible();

  const panelReveal = (delay: number): React.CSSProperties => ({
    opacity:    visible ? 1 : 0,
    transform:  visible ? "translateY(0)" : "translateY(32px)",
    transition: `opacity 0.7s ${delay}s ease, transform 0.7s ${delay}s ease`,
  });

  return (
    <section
      ref={ref}
      style={{ position: "relative", zIndex: 10, padding: "96px 32px" }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <SectionLabel text="// THE SRE REALITY" />

        {/* Headline */}
        <h2
          style={{
            ...panelReveal(0.05),
            fontSize:      48,
            fontWeight:    700,
            lineHeight:    1.1,
            letterSpacing: "-0.02em",
            marginBottom:  12,
            color:         "#fff",
          }}
        >
          Stop debugging at 3 AM.
        </h2>
        <p style={{ ...panelReveal(0.12), fontSize: 13, color: "rgba(255,255,255,0.32)", marginBottom: 52, maxWidth: 520, lineHeight: 1.7 }}>
          Your pager goes off. It's 3 AM. This is the last time.
        </p>

        {/* Two-column comparison */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Left: The Old Way */}
          <div style={panelReveal(0.18)}>
            <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "rgba(239,68,68,0.6)", textTransform: "uppercase", marginBottom: 12 }}>
              ✗ The Old Way
            </div>
            <div
              style={{
                border:     "1px solid rgba(239,68,68,0.2)",
                background: "rgba(239,68,68,0.03)",
                overflow:   "hidden",
              }}
            >
              {/* Slack-style header */}
              <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(239,68,68,0.12)", background: "rgba(239,68,68,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(239,68,68,0.7)", letterSpacing: "0.1em" }}>#incidents</span>
                <span style={{ marginLeft: "auto", fontSize: 9, color: "rgba(239,68,68,0.3)", letterSpacing: "0.2em" }}>SLACK THREAD</span>
              </div>

              {/* Messages */}
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
                {SLACK_CHAOS.map((msg, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", background: msg.dot, opacity: 0.7, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>
                      {msg.user[0].toUpperCase()}
                    </span>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{msg.user}</span>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{msg.time}</span>
                      </div>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, margin: 0 }}>{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Status badge */}
              <div style={{ margin: "0 16px 16px", padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, color: "rgba(239,68,68,0.7)", letterSpacing: "0.2em", fontWeight: 700 }}>⚠ UNRESOLVED</span>
                <span style={{ fontSize: 9, color: "rgba(239,68,68,0.4)", letterSpacing: "0.15em" }}>3:47 AM · 43 MINS · STILL BURNING</span>
              </div>
            </div>
          </div>

          {/* Right: The Praxis Way */}
          <div style={panelReveal(0.28)}>
            <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "rgba(0,255,106,0.6)", textTransform: "uppercase", marginBottom: 12 }}>
              ✓ With Praxis
            </div>
            <div
              style={{
                border:     "1px solid rgba(0,255,106,0.18)",
                background: "rgba(0,255,106,0.02)",
                overflow:   "hidden",
              }}
            >
              {/* Header */}
              <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(0,255,106,0.1)", background: "rgba(0,255,106,0.05)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00FF6A", boxShadow: "0 0 6px #00FF6A", animation: "pulse-dot 2s ease-in-out infinite", display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "rgba(0,255,106,0.8)", letterSpacing: "0.1em" }}>Praxis · payment-service</span>
                <span style={{ marginLeft: "auto", fontSize: 9, color: "rgba(0,255,106,0.3)", letterSpacing: "0.2em" }}>AUTONOMOUS AGENT</span>
              </div>

              {/* Steps */}
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {PRAXIS_STEPS.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 12, color: "#00FF6A", flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{step.text}</span>
                  </div>
                ))}
              </div>

              {/* Status badge */}
              <div style={{ margin: "0 16px 16px", padding: "10px 14px", background: "rgba(0,255,106,0.06)", border: "1px solid rgba(0,255,106,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, color: "#00FF6A", letterSpacing: "0.2em", fontWeight: 700 }}>✓ RESOLVED</span>
                <span style={{ fontSize: 9, color: "rgba(0,255,106,0.45)", letterSpacing: "0.15em" }}>3:47 AM · 28 SECONDS · ZERO HUMANS PAGED</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── Bento Box Section ──────────────────────────────────────────────────────────

function BentoSection() {
  const [ref, visible] = useScrollVisible();

  const reveal = (delay: number): React.CSSProperties => ({
    opacity:    visible ? 1 : 0,
    transform:  visible ? "translateY(0)" : "translateY(28px)",
    transition: `opacity 0.65s ${delay}s ease, transform 0.65s ${delay}s ease`,
  });

  return (
    <section ref={ref} style={{ position: "relative", zIndex: 10, padding: "0 32px 96px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <SectionLabel text="// GOVERNANCE PROTOCOL" />
        <h2 style={{ ...reveal(0.05), fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff", marginBottom: 48, lineHeight: 1.15 }}>
          Enterprise-grade safety,<br />built into every merge.
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "auto auto",
            gap: 12,
          }}
        >
          {/* Card 1: Governance Board — col span 2 */}
          <BentoCard
            style={{ gridColumn: "span 2", ...reveal(0.12) }}
            accent="#00D4FF"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.35em", color: "rgba(0,212,255,0.6)", textTransform: "uppercase", marginBottom: 8 }}>🏛️ Governance Board</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: "-0.01em" }}>Three-Critic Concurrent Audit</h3>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.7, maxWidth: 340 }}>
                  Security, FinOps, and Architecture Critics audit every patch in parallel via Promise.all.
                  All three must vote PASS before a single line touches production.
                </p>
              </div>
            </div>

            {/* Mock audit display */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { role: "Security Critic",      verdict: "SECURE", color: "#00D4FF" },
                { role: "FinOps Critic",         verdict: "PASS",   color: "#00FF6A" },
                { role: "Architecture Critic",   verdict: "PASS",   color: "#00FF6A" },
              ].map(({ role, verdict, color }) => (
                <div
                  key={role}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 14px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{role}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.2em", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, display: "inline-block" }} />
                    {verdict}
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>

          {/* Card 2: Vector Memory — col span 1 */}
          <BentoCard style={{ gridColumn: "span 1", ...reveal(0.2) }} accent="#F59E0B">
            <div style={{ fontSize: 10, letterSpacing: "0.35em", color: "rgba(245,158,11,0.6)", textTransform: "uppercase", marginBottom: 8 }}>🧠 Vector Memory</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10, letterSpacing: "-0.01em" }}>Incident Memory</h3>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.7, marginBottom: 24 }}>
              Every approved fix is embedded via Vertex AI and stored in Firestore.
              Future incidents instantly inherit proven solutions.
            </p>

            {/* Similarity meter */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 2 }}>Recent Match</div>
              {[
                { id: "INC-4821", sim: 94 },
                { id: "INC-4803", sim: 71 },
              ].map(({ id, sim }) => (
                <div key={id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{id}</span>
                    <span style={{ fontSize: 10, color: sim >= 90 ? "#F59E0B" : "rgba(255,255,255,0.2)", fontWeight: sim >= 90 ? 700 : 400 }}>{sim}%</span>
                  </div>
                  <div style={{ height: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${sim}%`, background: sim >= 90 ? "#F59E0B" : "rgba(255,255,255,0.15)", transition: "width 1s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>

          {/* Card 3: Post-Mortems — col span 3 */}
          <BentoCard style={{ gridColumn: "span 3", ...reveal(0.28) }} accent="#00FF6A">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }}>
              {/* Left: description */}
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.35em", color: "rgba(0,255,106,0.6)", textTransform: "uppercase", marginBottom: 8 }}>📄 Zero-Touch Post-Mortems</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 12, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                  Automated runbooks.<br />Committed. Zero effort.
                </h3>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.75 }}>
                  After every approved merge, the Documentation Agent generates a professional Markdown post-mortem
                  with Root Cause Analysis, Governance Audit Trail, and Resolution notes — then commits it directly
                  to <code style={{ color: "rgba(0,255,106,0.6)", fontSize: 10 }}>docs/incidents/</code> in GitLab.
                  No ticket. No meeting. No SRE overtime.
                </p>
              </div>

              {/* Right: mock markdown preview */}
              <div
                style={{
                  background: "#0A0A0F",
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: "16px 20px",
                  fontSize: 11,
                  lineHeight: 1.7,
                  overflow: "hidden",
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 9, letterSpacing: "0.25em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#00FF6A", fontSize: 10 }}>●</span> docs/incidents/INC-4821.md
                </div>
                <div style={{ color: "#fff",                    fontWeight: 700, marginBottom: 4  }}>{"# Post-Mortem: INC-4821"}</div>
                <div style={{ color: "rgba(255,255,255,0.2)", marginBottom: 10, fontSize: 10 }}>{"**Date:** 2026-05-20  **Status:** ✓ RESOLVED"}</div>
                <div style={{ color: "#00D4FF",                 fontWeight: 600, marginBottom: 4  }}>{"## Incident Summary"}</div>
                <div style={{ color: "rgba(255,255,255,0.3)", marginBottom: 12, fontSize: 10 }}>{"Payment service experienced elevated error rates triggered by a race condition in token validation..."}</div>
                <div style={{ color: "#00D4FF",                 fontWeight: 600, marginBottom: 4  }}>{"## Root Cause Analysis"}</div>
                <div style={{ color: "rgba(255,255,255,0.3)", marginBottom: 12, fontSize: 10 }}>{"Auth middleware lacked exponential backoff, causing cascading failures under load..."}</div>
                <div style={{ color: "#00D4FF",                 fontWeight: 600, marginBottom: 4  }}>{"## Governance Audit Trail"}</div>
                <div style={{ color: "rgba(0,255,106,0.6)", fontSize: 10 }}>{"✓ Security: SECURE  ✓ FinOps: PASS  ✓ Architecture: PASS"}</div>
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

// ── Architecture Timeline Section ──────────────────────────────────────────────

function TimelineSection() {
  const [ref, visible] = useScrollVisible(0.08);

  return (
    <section ref={ref} style={{ position: "relative", zIndex: 10, padding: "0 32px 112px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <SectionLabel text="// HOW IT WORKS" />
        <h2
          style={{
            fontSize:      40,
            fontWeight:    700,
            letterSpacing: "-0.02em",
            color:         "#fff",
            marginBottom:  64,
            lineHeight:    1.15,
            opacity:       visible ? 1 : 0,
            transform:     visible ? "translateY(0)" : "translateY(24px)",
            transition:    "opacity 0.65s 0.05s ease, transform 0.65s 0.05s ease",
          }}
        >
          How Praxis Self-Heals.
        </h2>

        <div style={{ position: "relative" }}>
          {/* Vertical connector line */}
          <div
            style={{
              position: "absolute",
              left: 19,
              top: 40,
              bottom: 40,
              width: 1,
              background: "linear-gradient(180deg, rgba(0,212,255,0.3) 0%, rgba(0,255,106,0.3) 50%, rgba(167,139,250,0.3) 100%)",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {TIMELINE_STEPS.map((step, i) => (
              <TimelineStep key={step.n} step={step} index={i} visible={visible} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FeatureCard({
  feature,
  delay,
  mounted,
}: {
  feature: typeof FEATURES[number];
  delay: number;
  mounted: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:  hovered ? "#0C0C10" : "#050507",
        padding:     "36px 32px",
        cursor:      "default",
        transition:  `opacity 0.6s ${delay}s, transform 0.6s ${delay}s, background 0.25s`,
        opacity:     mounted ? 1 : 0,
        transform:   mounted ? "translateY(0)" : "translateY(16px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.13)", letterSpacing: "0.4em" }}>[{feature.index}]</span>
        <span style={{ fontSize: 22, color: feature.accent, opacity: hovered ? 1 : 0.5, transition: "opacity 0.25s", filter: hovered ? `drop-shadow(0 0 8px ${feature.accent})` : "none" }}>
          {feature.glyph}
        </span>
      </div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "0.04em", marginBottom: 10 }}>{feature.title}</h3>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", lineHeight: 1.75 }}>{feature.body}</p>
      <div style={{ marginTop: 24, height: 1, overflow: "hidden" }}>
        <div style={{ height: "100%", background: feature.accent, width: hovered ? "100%" : "0%", transition: "width 0.45s ease" }} />
      </div>
    </div>
  );
}

function BentoCard({
  children,
  style: extraStyle,
  accent,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  accent: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:  hovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.025)",
        border:      `1px solid ${hovered ? `${accent}30` : "rgba(255,255,255,0.07)"}`,
        padding:     "28px 28px",
        transition:  "background 0.25s, border-color 0.25s",
        position:    "relative",
        overflow:    "hidden",
        ...extraStyle,
      }}
    >
      {/* Subtle top accent glow on hover */}
      {hovered && (
        <div
          aria-hidden
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg, transparent, ${accent}40, transparent)`,
          }}
        />
      )}
      {children}
    </div>
  );
}

function TimelineStep({
  step,
  index,
  visible,
}: {
  step: typeof TIMELINE_STEPS[number];
  index: number;
  visible: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const delay = 0.15 + index * 0.12;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:    "flex",
        gap:        28,
        padding:    "28px 0",
        borderBottom: index < TIMELINE_STEPS.length - 1 ? "none" : undefined,
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateX(0)" : "translateX(-20px)",
        transition: `opacity 0.6s ${delay}s ease, transform 0.6s ${delay}s ease`,
        cursor:     "default",
      }}
    >
      {/* Step number circle */}
      <div style={{ flexShrink: 0, position: "relative", zIndex: 1 }}>
        <div
          style={{
            width:      38,
            height:     38,
            borderRadius: "50%",
            border:     `1px solid ${hovered ? step.accent : "rgba(255,255,255,0.12)"}`,
            background: hovered ? `${step.accent}14` : "rgba(5,5,7,0.9)",
            display:    "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "border-color 0.25s, background 0.25s",
            boxShadow:  hovered ? `0 0 16px ${step.accent}30` : "none",
          }}
        >
          <span
            style={{
              fontSize:   11,
              fontWeight: 700,
              color:      hovered ? step.accent : "rgba(255,255,255,0.3)",
              letterSpacing: "0.05em",
              transition: "color 0.25s",
            }}
          >
            {step.n}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingTop: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <h3
            style={{
              fontSize:   15,
              fontWeight: 700,
              color:      hovered ? "#fff" : "rgba(255,255,255,0.75)",
              letterSpacing: "-0.01em",
              transition: "color 0.25s",
              margin:     0,
            }}
          >
            {step.title}
          </h3>
          <span
            style={{
              fontSize:   9,
              letterSpacing: "0.25em",
              color:      hovered ? step.accent : "rgba(255,255,255,0.18)",
              border:     `1px solid ${hovered ? `${step.accent}40` : "rgba(255,255,255,0.08)"}`,
              padding:    "2px 7px",
              textTransform: "uppercase",
              transition: "color 0.25s, border-color 0.25s",
            }}
          >
            {step.tag}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.75, margin: 0, maxWidth: 580 }}>
          {step.desc}
        </p>
      </div>
    </div>
  );
}

function TechBadge({ label }: { label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize:      10,
        border:        `1px solid ${hovered ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
        padding:       "2px 8px",
        color:         hovered ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.22)",
        letterSpacing: "0.15em",
        cursor:        "default",
        transition:    "border-color 0.2s, color 0.2s",
      }}
    >
      {label}
    </span>
  );
}
