import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StreamEvent, StreamEventStatus } from "@/data/mockData";

interface CognitiveStreamProps {
  events: StreamEvent[];
}

function StatusDot({ status }: { status: StreamEventStatus }) {
  if (status === "complete") {
    return (
      <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#00FF6A] text-xs">
        ✓
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#FF3B30] text-xs">
        ✗
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="w-4 h-4 flex items-center justify-center shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse-dot" />
      </span>
    );
  }
  return (
    <span className="w-4 h-4 flex items-center justify-center shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-[#1E1E1E]" />
    </span>
  );
}

function EventRow({ event, isNew }: { event: StreamEvent; isNew: boolean }) {
  return (
    <div
      className={`flex items-start gap-2 py-2.5 px-3 border-b border-[#0F0F0F] transition-colors ${
        event.status === "active" ? "bg-[#F5A623]/5" : ""
      } ${isNew ? "animate-slide-up" : ""}`}
    >
      <StatusDot status={event.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 justify-between">
          <span
            className={`text-xs leading-tight ${
              event.status === "complete"
                ? "text-[#E0E0E0]"
                : event.status === "active"
                ? "text-[#F5A623]"
                : event.status === "error"
                ? "text-[#FF3B30]"
                : "text-[#4A4A4A]"
            }`}
          >
            {event.label}
          </span>
          <span className="text-[#2A2A2A] text-[10px] tabular-nums shrink-0 ml-1">
            {event.timestamp}
          </span>
        </div>
        {event.detail && (
          <div className="mt-0.5 flex items-center gap-1.5">
            {event.tool && (
              <span className="text-[#1E1E1E] border border-[#1E1E1E] text-[9px] px-1 tracking-wider leading-tight">
                {event.tool}
              </span>
            )}
            <span className="text-[#3A3A3A] text-[10px] leading-tight">
              {event.detail}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CognitiveStream({ events }: CognitiveStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLengthRef.current = events.length;
  }, [events]);

  const activeEvent = events.find((e) => e.status === "active");

  return (
    <div className="flex flex-col h-full border-l border-[#1E1E1E]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1E1E1E] bg-[#070707] flex items-center justify-between shrink-0">
        <span className="text-[#4A4A4A] text-xs tracking-[0.25em] uppercase">
          Cognitive Stream
        </span>
        <div className="flex items-center gap-1.5">
          {activeEvent && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse-dot" />
          )}
          <span className="text-[#2A2A2A] text-xs">{events.length}</span>
        </div>
      </div>

      {/* Events */}
      <ScrollArea className="flex-1 bg-[#070707]" ref={scrollRef as never}>
        <div className="flex flex-col">
          {events.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <span className="text-[#2A2A2A] text-xs tracking-widest">
                STANDBY
              </span>
            </div>
          ) : (
            events.map((event, i) => (
              <EventRow
                key={event.id}
                event={event}
                isNew={i === events.length - 1 && i >= prevLengthRef.current}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer: current thought */}
      {activeEvent && (
        <div className="px-3 py-2 border-t border-[#1E1E1E] bg-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[#F5A623] text-[10px] tracking-widest animate-blink">
              ▶
            </span>
            <span className="text-[#4A4A4A] text-[10px] truncate">
              {activeEvent.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
