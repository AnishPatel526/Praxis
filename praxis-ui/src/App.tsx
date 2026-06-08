import { useEffect, useState, useCallback, useRef } from "react";
import { TopBar } from "@/components/TopBar";
import { IncidentCard } from "@/components/IncidentCard";
import { CognitiveStream } from "@/components/CognitiveStream";
import { HITLModal } from "@/components/HITLModal";
import { A2UIRenderer } from "@/components/A2UIRenderer";
import { LandingPage } from "@/components/LandingPage";
import { Button } from "@/components/ui/button";
import {
  A2UI_PAYLOADS,
  STREAM_EVENTS_SEQUENCE,
  type A2UIPayload,
} from "@/data/mockData";
import "./index.css";

const STEP_DELAYS = [0, 2000, 2500, 2800, 2200, 3000, 2500];

interface TriggerResponse {
  success: boolean;
  incidentId: string;
  pipeline: {
    traceData: string;
    agentAnalysis: A2UIPayload;
    model: string;
    executionMode: "live" | "mocked";
  };
  error?: string;
}

export default function App() {
  const [view, setView] = useState<"landing" | "dashboard">("landing");
  const [stepIndex, setStepIndex] = useState(0);
  const [payloadIndex, setPayloadIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [postApprovalState, setPostApprovalState] = useState<null | "approved" | "cancelled">(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [backendPayload, setBackendPayload] = useState<A2UIPayload | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [executionMode, setExecutionMode] = useState<"live" | "mocked" | null>(null);

  // Prevent the animation from advancing past root_cause until backend responds
  const backendReadyRef = useRef(false);

  const totalSteps = STREAM_EVENTS_SEQUENCE.length;
  const isFinal = stepIndex === totalSteps - 1;

  const advanceStep = useCallback(() => {
    setStepIndex((prev) => {
      const next = prev + 1;

      // Hold at step 4 (root_cause display) until backend responds
      if (next === 5 && !backendReadyRef.current) {
        return prev;
      }

      const payloadMap: Record<number, number> = {
        1: 1, // analysis
        2: 2, // telemetry
        3: 2,
        4: 3, // root_cause
        5: 4, // patch_ready (uses backend payload if available)
        6: 4,
      };
      if (payloadMap[next] !== undefined) {
        setPayloadIndex(payloadMap[next]);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isRunning || isFinal) return;
    const delay = STEP_DELAYS[stepIndex + 1] ?? 2000;
    const t = setTimeout(advanceStep, delay);
    return () => clearTimeout(t);
  }, [isRunning, stepIndex, isFinal, advanceStep]);

  // When backend responds and we're held at step 4, unblock and advance
  useEffect(() => {
    if (backendPayload && isRunning && stepIndex === 4) {
      backendReadyRef.current = true;
      const t = setTimeout(advanceStep, 600);
      return () => clearTimeout(t);
    }
  }, [backendPayload, isRunning, stepIndex, advanceStep]);

  // Show HITL modal shortly after reaching final step
  useEffect(() => {
    if (isFinal && isRunning && !postApprovalState) {
      const t = setTimeout(() => setShowModal(true), 600);
      return () => clearTimeout(t);
    }
  }, [isFinal, isRunning, postApprovalState]);

  const handleStart = async () => {
    // Reset all state
    backendReadyRef.current = false;
    setBackendPayload(null);
    setBackendError(null);
    setExecutionMode(null);
    setStepIndex(1);
    setPayloadIndex(1);
    setIsRunning(true);
    setPostApprovalState(null);
    setShowModal(false);

    // Fire-and-forget the backend call — animation runs in parallel
    try {
      const res = await fetch("/api/agent/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: "INC-4821", service: "payment-service" }),
      });

      const data = (await res.json()) as TriggerResponse;

      if (!data.success) {
        setBackendError(data.error ?? "Unknown error from backend");
        backendReadyRef.current = true; // unblock animation even on error
        return;
      }

      setBackendPayload(data.pipeline.agentAnalysis);
      setExecutionMode(data.pipeline.executionMode);
      backendReadyRef.current = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setBackendError(msg);
      backendReadyRef.current = true;
    }
  };

  const handleReset = () => {
    backendReadyRef.current = false;
    setStepIndex(0);
    setPayloadIndex(0);
    setIsRunning(false);
    setShowModal(false);
    setPostApprovalState(null);
    setBackendPayload(null);
    setBackendError(null);
    setExecutionMode(null);
    setPrUrl(null);
  };

  const handleApprove = (url: string) => {
    setPrUrl(url);
    setShowModal(false);
    setPostApprovalState("approved");
  };

  const handleCancel = () => {
    setShowModal(false);
    setPostApprovalState("cancelled");
  };

  const currentEvents = STREAM_EVENTS_SEQUENCE[stepIndex] ?? [];

  // Use the live backend payload at patch_ready step; fallback to local mock
  const currentPayload: A2UIPayload =
    payloadIndex === 4 && backendPayload
      ? backendPayload
      : A2UI_PAYLOADS[payloadIndex];

  if (view === "landing") {
    return <LandingPage onEnterDashboard={() => setView("dashboard")} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#070707] text-[#E0E0E0] font-mono overflow-hidden">
      <TopBar stepIndex={stepIndex} totalSteps={totalSteps} onGoHome={() => setView("landing")} />

      <div className="flex flex-1 overflow-hidden">
        {/* Main workspace */}
        <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto min-w-0">

          {/* Section label */}
          <div className="flex items-center gap-3">
            <span className="text-[#2A2A2A] text-[10px] tracking-[0.3em] uppercase">
              Workspace
            </span>
            <div className="flex-1 border-t border-[#0F0F0F]" />
            {executionMode && (
              <span className={`text-[9px] tracking-widest border px-2 py-0.5 ${
                executionMode === "live"
                  ? "text-[#00FF6A] border-[#00FF6A]/30"
                  : "text-[#4A4A4A] border-[#1E1E1E]"
              }`}>
                {executionMode === "live" ? "GEMINI LIVE" : "MOCKED"}
              </span>
            )}
          </div>

          {/* Incident card */}
          <IncidentCard stepIndex={stepIndex} />

          {/* Agent output section */}
          <div className="border border-[#1E1E1E]">
            <div className="px-4 py-2 border-b border-[#1E1E1E] bg-[#0F0F0F] flex items-center justify-between">
              <span className="text-[#4A4A4A] text-[10px] tracking-[0.25em] uppercase">
                Agent Output
              </span>
              <span className="text-[#2A2A2A] text-[10px] tracking-wider">
                A2UI · JSON→COMPONENT
              </span>
            </div>
            <div className="p-0">
              <A2UIRenderer key={payloadIndex} payload={currentPayload} />
            </div>
          </div>

          {/* Backend error notice */}
          {backendError && (
            <div className="border border-[#FF3B30]/40 bg-[#FF3B30]/5 px-4 py-3 animate-fade-in">
              <div className="text-xs font-bold tracking-widest text-[#FF3B30] uppercase mb-1">
                ✗ Backend Pipeline Error
              </div>
              <div className="text-[10px] text-[#FF3B30]/70">{backendError}</div>
            </div>
          )}

          {/* Post-approval notification */}
          {postApprovalState && (
            <div className={`border px-4 py-3 animate-fade-in ${
              postApprovalState === "approved"
                ? "border-[#00FF6A]/40 bg-[#00FF6A]/5 text-[#00FF6A]"
                : "border-[#FF3B30]/40 bg-[#FF3B30]/5 text-[#FF3B30]"
            }`}>
              <div className="text-xs font-bold tracking-widest uppercase mb-1">
                {postApprovalState === "approved"
                  ? "✓ Merge Request Submitted"
                  : "✗ Operation Cancelled"}
              </div>
              <div className="text-[10px] opacity-70">
                {postApprovalState === "approved" ? (
                  prUrl ? (
                    <span>
                      MR opened at{" "}
                      <a
                        href={prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:opacity-100 opacity-80"
                      >
                        {prUrl}
                      </a>
                      {" "}· Awaiting pipeline run and code review.
                    </span>
                  ) : (
                    "MR opened at AnishPatel526/praxis-test · Awaiting pipeline run and code review."
                  )
                ) : (
                  "No changes were made. The incident remains open for manual review."
                )}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3 pb-2">
            {!isRunning ? (
              <Button
                onClick={handleStart}
                className="bg-[#00FF6A] text-[#070707] hover:bg-[#00FF6A]/90 rounded-none text-xs tracking-[0.2em] uppercase font-bold px-6 font-mono h-9"
              >
                ▶ Run Agent
              </Button>
            ) : isFinal && !postApprovalState ? (
              <Button
                onClick={() => setShowModal(true)}
                className="bg-[#F5A623] text-[#070707] hover:bg-[#F5A623]/90 rounded-none text-xs tracking-[0.2em] uppercase font-bold px-6 font-mono h-9 animate-pulse-slow"
              >
                ⚠ Review Patch
              </Button>
            ) : null}

            {stepIndex > 0 && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-[#1E1E1E] text-[#4A4A4A] hover:bg-[#0F0F0F] hover:text-[#E0E0E0] hover:border-[#4A4A4A] rounded-none text-xs tracking-widest uppercase font-mono h-9"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Cognitive Stream sidebar */}
        <div className="w-72 shrink-0 flex flex-col overflow-hidden border-l border-[#0F0F0F]">
          <CognitiveStream events={currentEvents} />
        </div>
      </div>

      <HITLModal
        open={showModal}
        onApprove={handleApprove}
        onCancel={handleCancel}
        securityReview={backendPayload?.securityReview}
        files={backendPayload?.files}
      />
    </div>
  );
}
