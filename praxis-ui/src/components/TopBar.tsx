import { useEffect, useRef, useState } from "react";
import { ChevronDown, User } from "lucide-react";

interface TopBarProps {
  stepIndex: number;
  totalSteps: number;
  onGoHome?: () => void;
}

const WORKSPACES = [
  { id: "prod",    label: "Praxis Production" },
  { id: "staging", label: "Praxis Staging"    },
  { id: "dev",     label: "Praxis Dev"        },
] as const;

export function TopBar({ stepIndex, totalSteps, onGoHome }: TopBarProps) {
  const [time, setTime]                   = useState(new Date());
  const [wsOpen, setWsOpen]               = useState(false);
  const [activeWs, setActiveWs]           = useState(WORKSPACES[0]);
  const dropdownRef                       = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Close workspace dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isLive = stepIndex > 0 && stepIndex < totalSteps - 1;
  const isDone = stepIndex === totalSteps - 1;

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-0 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm font-mono h-[52px]">

      {/* ── Left: Logo + Workspace Switcher ── */}
      <div className="flex items-center gap-3">

        {/* Logo / home button */}
        <button
          onClick={onGoHome}
          className="text-[#00FF6A] text-sm font-bold tracking-[0.3em] uppercase bg-transparent border-none cursor-pointer p-0 font-mono hover:opacity-70 transition-opacity"
        >
          PRAXIS
        </button>

        <span className="text-zinc-800 text-xs select-none">│</span>

        {/* Workspace Switcher */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setWsOpen((o) => !o)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs hover:bg-zinc-800/70 transition-colors group"
          >
            <span className="text-zinc-600 tracking-wider text-[10px]">Workspace:</span>
            <span className="text-zinc-300 font-medium group-hover:text-white transition-colors">
              {activeWs.label}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-zinc-600 transition-transform duration-200 ${wsOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {wsOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-52 bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/50 z-50 overflow-hidden">
              <div className="px-3 py-1.5 border-b border-zinc-800">
                <span className="text-[9px] text-zinc-600 tracking-[0.35em] uppercase">Switch workspace</span>
              </div>
              {WORKSPACES.map((ws) => {
                const isActive = ws.id === activeWs.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => { setActiveWs(ws); setWsOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-xs flex items-center gap-2.5 transition-colors ${
                      isActive
                        ? "bg-zinc-800/50 text-white"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isActive ? "bg-[#00FF6A] shadow-[0_0_6px_rgba(0,255,106,0.8)]" : "bg-zinc-700"
                      }`}
                    />
                    <span className="tracking-wide">{ws.label}</span>
                    {isActive && (
                      <span className="ml-auto text-[9px] text-zinc-600 tracking-widest uppercase">Active</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Center: Breadcrumb ── */}
      <div className="hidden md:flex items-center gap-2 text-zinc-600 text-[10px] tracking-wider absolute left-1/2 -translate-x-1/2">
        <span>payment-service</span>
        <span className="text-zinc-800">/</span>
        <span>main</span>
        <span className="text-zinc-800">/</span>
        <span className="text-[#F5A623]">BUILD #2847</span>
      </div>

      {/* ── Right: Status + Time + Profile ── */}
      <div className="flex items-center gap-4">

        {/* Pipeline status */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isDone ? "bg-[#00FF6A]" : isLive ? "bg-[#F5A623] animate-pulse" : "bg-zinc-700"
            }`}
          />
          <span
            className={`text-[10px] tracking-widest ${
              isDone ? "text-[#00FF6A]" : isLive ? "text-[#F5A623]" : "text-zinc-600"
            }`}
          >
            {isDone ? "AWAITING REVIEW" : isLive ? "RUNNING" : "STANDBY"}
          </span>
        </div>

        <span className="text-zinc-800 text-xs hidden md:block select-none">│</span>

        <span className="text-zinc-600 text-[10px] tabular-nums hidden md:block">
          {time.toLocaleTimeString("en-US", { hour12: false })}
        </span>

        <span className="text-zinc-800 text-xs hidden md:block select-none">│</span>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-1 cursor-default group">
          {/* Avatar + online dot */}
          <div className="relative flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:border-zinc-600 transition-colors">
              <User className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            {/* Online / on-call status dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00FF6A] border-2 border-zinc-950 shadow-[0_0_6px_rgba(0,255,106,0.7)]" />
          </div>

          {/* Name + role */}
          <div className="flex flex-col leading-none gap-0.5">
            <span className="text-[11px] font-bold text-white tracking-wide">Anish Patel</span>
            <span className="text-[9px] text-zinc-500 tracking-[0.25em] uppercase">Staff SRE</span>
          </div>
        </div>

      </div>
    </header>
  );
}
