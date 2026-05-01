import { useEffect, useState } from "react";

interface TopBarProps {
  stepIndex: number;
  totalSteps: number;
}

export function TopBar({ stepIndex, totalSteps }: TopBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const isLive = stepIndex > 0 && stepIndex < totalSteps - 1;
  const isDone = stepIndex === totalSteps - 1;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[#1E1E1E] bg-[#070707]">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <span className="text-[#00FF6A] text-lg font-bold tracking-[0.3em] uppercase">
          PRAXIS
        </span>
        <span className="text-[#1E1E1E] text-xs select-none">│</span>
        <span className="text-[#4A4A4A] text-xs tracking-widest uppercase">
          DevOps Intelligence
        </span>
      </div>

      {/* Center breadcrumb */}
      <div className="hidden md:flex items-center gap-2 text-[#4A4A4A] text-xs tracking-wider">
        <span>payment-service</span>
        <span className="text-[#1E1E1E]">/</span>
        <span>main</span>
        <span className="text-[#1E1E1E]">/</span>
        <span className="text-[#F5A623]">BUILD #2847</span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isDone
                ? "bg-[#00FF6A]"
                : isLive
                ? "bg-[#F5A623] animate-pulse-dot"
                : "bg-[#4A4A4A]"
            }`}
          />
          <span className={`text-xs tracking-widest ${
            isDone ? "text-[#00FF6A]" : isLive ? "text-[#F5A623]" : "text-[#4A4A4A]"
          }`}>
            {isDone ? "AWAITING REVIEW" : isLive ? "RUNNING" : "STANDBY"}
          </span>
        </div>
        <span className="text-[#1E1E1E] text-xs hidden md:block select-none">│</span>
        <span className="text-[#4A4A4A] text-xs tabular-nums hidden md:block">
          {time.toLocaleTimeString("en-US", { hour12: false })}
        </span>
      </div>
    </header>
  );
}
