import type { A2UIPayload } from "@/data/mockData";

interface A2UIRendererProps {
  payload: A2UIPayload;
}

const SEVERITY_STYLES = {
  critical: "text-[#FF3B30] border-[#FF3B30]/40 bg-[#FF3B30]/5",
  high: "text-[#F5A623] border-[#F5A623]/40 bg-[#F5A623]/5",
  medium: "text-[#E0E0E0] border-[#1E1E1E] bg-[#0F0F0F]",
  low: "text-[#00FF6A] border-[#00FF6A]/30 bg-[#00FF6A]/5",
};

const TYPE_LABEL = {
  analysis: "TRIAGE",
  telemetry: "TELEMETRY",
  root_cause: "ROOT CAUSE",
  patch_ready: "PATCH READY",
  idle: "STANDBY",
};

export function A2UIRenderer({ payload }: A2UIRendererProps) {
  const severityStyle = payload.severity
    ? SEVERITY_STYLES[payload.severity]
    : "text-[#4A4A4A] border-[#1E1E1E] bg-[#0A0A0A]";

  return (
    <div className={`border animate-fade-in ${severityStyle}`}>
      {/* Type badge + title */}
      <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
        payload.severity ? severityStyle.split(" ").slice(2).join(" ") : "border-[#1E1E1E]"
      }`}>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] tracking-[0.2em] font-bold ${
            payload.severity ? severityStyle.split(" ")[0] : "text-[#4A4A4A]"
          }`}>
            {TYPE_LABEL[payload.type]}
          </span>
        </div>
        {payload.type === "patch_ready" && (
          <span className="text-[10px] text-[#00FF6A] border border-[#00FF6A]/30 px-2 py-0.5 tracking-wider">
            VERIFIED
          </span>
        )}
      </div>

      {/* Title */}
      <div className="px-4 pt-3 pb-1">
        <h2 className="text-sm font-bold tracking-wider text-[#E0E0E0] uppercase">
          {payload.title}
        </h2>
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        <p className="text-[#9A9A9A] text-xs leading-relaxed">{payload.body}</p>
      </div>

      {/* Meta table */}
      {payload.meta && (
        <div className="px-4 pb-3">
          <div className="border border-[#1E1E1E] divide-y divide-[#0F0F0F]">
            {Object.entries(payload.meta).map(([k, v]) => (
              <div key={k} className="flex items-center px-3 py-1.5 gap-4">
                <span className="text-[#3A3A3A] text-[10px] tracking-widest w-24 shrink-0 uppercase">
                  {k}
                </span>
                <span className="text-[#E0E0E0] text-xs">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code block */}
      {payload.codeBlock && (
        <div className="px-4 pb-4">
          <div className="border border-[#1E1E1E] bg-[#050505]">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1E1E1E]">
              <span className="text-[#3A3A3A] text-[9px] tracking-widest uppercase">
                {payload.codeBlock.language}
              </span>
            </div>
            <pre className="p-3 text-[10px] text-[#9A9A9A] overflow-x-auto leading-relaxed whitespace-pre-wrap break-words">
              {payload.codeBlock.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
