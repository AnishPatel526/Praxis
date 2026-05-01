import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MOCK_DIFF, INCIDENT, PATCH_SUBMISSION, type SecurityReview } from "@/data/mockData";

interface HITLModalProps {
  open: boolean;
  onApprove: (prUrl: string) => void;
  onCancel: () => void;
  securityReview?: SecurityReview;
}

type ApproveState = "idle" | "loading" | "error";

interface ApproveResponse {
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  branchName?: string;
  error?: string;
}

function DiffLine({ line }: { line: string }) {
  const isAdded = line.startsWith("+") && !line.startsWith("+++");
  const isRemoved = line.startsWith("-") && !line.startsWith("---");
  const isHeader =
    line.startsWith("@@") || line.startsWith("diff") || line.startsWith("index");

  return (
    <div
      className={`px-3 py-0.5 font-mono text-xs leading-relaxed select-text ${
        isAdded
          ? "bg-[#00FF6A]/8 text-[#00FF6A] border-l-2 border-[#00FF6A]"
          : isRemoved
          ? "bg-[#FF3B30]/8 text-[#FF3B30] border-l-2 border-[#FF3B30]"
          : isHeader
          ? "text-[#F5A623] bg-[#F5A623]/5"
          : "text-[#4A4A4A]"
      }`}
    >
      <span className="select-none mr-2 opacity-40 tabular-nums text-[10px]">
        {isAdded ? "+" : isRemoved ? "−" : " "}
      </span>
      {line.startsWith("+") || line.startsWith("-") ? line.slice(1) : line}
    </div>
  );
}

function SecurityReviewBanner({ review }: { review: SecurityReview }) {
  const isSecure = review.rating === "SECURE";

  if (isSecure) {
    return (
      <div className="px-5 py-3 border-b border-[#00FF6A]/20 bg-[#00FF6A]/5 flex items-start gap-3">
        <Badge className="shrink-0 mt-0.5 bg-[#00FF6A]/15 text-[#00FF6A] border border-[#00FF6A]/40 hover:bg-[#00FF6A]/15 rounded-none text-[9px] tracking-[0.2em] font-bold px-2">
          ✓ SECURE
        </Badge>
        <p className="text-[#00FF6A]/80 text-[11px] leading-relaxed">
          {review.critique}
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-3 border-b border-[#FF3B30]/30 bg-[#FF3B30]/8 flex items-start gap-3">
      <Badge
        variant="destructive"
        className="shrink-0 mt-0.5 rounded-none text-[9px] tracking-[0.2em] font-bold px-2 bg-[#FF3B30] hover:bg-[#FF3B30]"
      >
        ⚠ RISKY
      </Badge>
      <p className="text-[#FF3B30]/90 text-[11px] leading-relaxed">
        {review.critique}
      </p>
    </div>
  );
}

export function HITLModal({ open, onApprove, onCancel, securityReview }: HITLModalProps) {
  const [approveState, setApproveState] = useState<ApproveState>("idle");
  const [approveError, setApproveError] = useState<string | null>(null);

  const handleApprove = async () => {
    setApproveState("loading");
    setApproveError(null);

    try {
      const res = await fetch("/api/agent/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(PATCH_SUBMISSION),
      });

      const data = (await res.json()) as ApproveResponse;

      if (!data.success || !data.prUrl) {
        setApproveError(data.error ?? "Backend returned an unsuccessful response.");
        setApproveState("error");
        return;
      }

      onApprove(data.prUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error — is the backend running?";
      setApproveError(msg);
      setApproveState("error");
    }
  };

  const handleCancel = () => {
    setApproveState("idle");
    setApproveError(null);
    onCancel();
  };

  const lines = MOCK_DIFF.split("\n");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="max-w-3xl bg-[#0A0A0A] border border-[#FF3B30]/40 p-0 rounded-none gap-0 font-mono">
        {/* Title bar */}
        <DialogHeader className="px-5 py-3 border-b border-[#1E1E1E] bg-[#0F0F0F]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-pulse-dot" />
              <DialogTitle className="text-xs font-bold tracking-[0.25em] text-[#E0E0E0] uppercase">
                Human Approval Required
              </DialogTitle>
            </div>
            <span className="text-[#4A4A4A] text-xs border border-[#1E1E1E] px-2 py-0.5">
              HITL — SUGGEST &amp; CONFIRM
            </span>
          </div>
        </DialogHeader>

        {/* Security Critic review — rendered before Proposed Action */}
        {securityReview && <SecurityReviewBanner review={securityReview} />}

        {/* Summary */}
        <div className="px-5 py-4 border-b border-[#1E1E1E] bg-[#070707]">
          <div className="text-[#4A4A4A] text-xs tracking-widest mb-2 uppercase">
            Proposed Action
          </div>
          <p className="text-[#E0E0E0] text-sm leading-relaxed">
            Submit pull request to{" "}
            <span className="text-[#00FF6A]">{INCIDENT.repo}</span> fixing the
            race condition in{" "}
            <span className="text-[#F5A623]">auth/middleware.ts</span>. Increases
            token TTL from 3 000 ms to 8 000 ms and adds retry logic with
            exponential backoff.
          </p>

          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              ["RISK", "LOW", "text-[#00FF6A]"],
              ["TESTS", "14 / 14", "text-[#00FF6A]"],
              ["FILES", "1 changed", "text-[#E0E0E0]"],
            ].map(([label, val, color]) => (
              <div key={label} className="border border-[#1E1E1E] px-3 py-2 bg-[#0F0F0F]">
                <div className="text-[#4A4A4A] text-[9px] tracking-widest mb-1">{label}</div>
                <div className={`text-xs font-medium ${color}`}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Diff view */}
        <div className="border-b border-[#1E1E1E]">
          <div className="px-4 py-2 bg-[#0F0F0F] border-b border-[#1E1E1E] flex items-center justify-between">
            <span className="text-[#4A4A4A] text-[10px] tracking-widest uppercase">
              auth/middleware.ts
            </span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-[#00FF6A]">+12</span>
              <span className="text-[#FF3B30]">−3</span>
            </div>
          </div>
          <ScrollArea className="h-48 bg-[#070707]">
            <div className="py-1">
              {lines.map((line, i) => (
                <DiffLine key={i} line={line} />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Submission error banner */}
        {approveState === "error" && approveError && (
          <div className="px-5 py-3 border-b border-[#FF3B30]/30 bg-[#FF3B30]/5 flex items-start gap-3">
            <span className="text-[#FF3B30] text-xs mt-0.5 shrink-0">✗</span>
            <div>
              <div className="text-[#FF3B30] text-xs font-bold tracking-widest uppercase mb-0.5">
                Submission Failed
              </div>
              <div className="text-[#FF3B30]/70 text-[10px] leading-relaxed">{approveError}</div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-5 py-4 flex items-center justify-between bg-[#0A0A0A]">
          <p className="text-[#3A3A3A] text-[10px] max-w-xs leading-relaxed">
            This action will create a pull request via GitHub MCP. You are
            responsible for final review before merge.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={approveState === "loading"}
              className="border-[#FF3B30]/50 text-[#FF3B30] hover:bg-[#FF3B30]/10 hover:text-[#FF3B30] hover:border-[#FF3B30] rounded-none text-xs tracking-widest uppercase px-5 font-mono disabled:opacity-40"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveState === "loading"}
              className={`rounded-none text-xs tracking-widest uppercase px-5 font-mono font-bold transition-all min-w-[120px] ${
                approveState === "loading"
                  ? "bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623] cursor-not-allowed"
                  : approveState === "error"
                  ? "bg-[#FF3B30] text-white hover:bg-[#FF3B30]/90"
                  : "bg-[#00FF6A] text-[#070707] hover:bg-[#00FF6A]/90"
              }`}
            >
              {approveState === "loading" ? (
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse-dot" />
                  Submitting...
                </span>
              ) : approveState === "error" ? (
                "Retry"
              ) : (
                "Approve PR"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
