import { INCIDENT } from "@/data/mockData";

interface IncidentCardProps {
  stepIndex: number;
}

export function IncidentCard({ stepIndex }: IncidentCardProps) {
  const isActive = stepIndex > 0;

  return (
    <div className={`border border-[#1E1E1E] transition-all duration-500 ${
      isActive ? "border-[#FF3B30]" : "border-[#1E1E1E]"
    }`}>
      {/* Header bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        isActive ? "border-[#FF3B30] bg-[#FF3B30]/5" : "border-[#1E1E1E] bg-[#0F0F0F]"
      }`}>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold tracking-widest ${
            isActive ? "text-[#FF3B30]" : "text-[#4A4A4A]"
          }`}>
            {INCIDENT.status}
          </span>
          <span className="text-[#1E1E1E] text-xs">│</span>
          <span className="text-[#4A4A4A] text-xs tracking-wider">{INCIDENT.id}</span>
        </div>
        <span className="text-[#4A4A4A] text-xs">{INCIDENT.triggeredAt}</span>
      </div>

      {/* Body */}
      <div className="px-4 py-4 bg-[#0A0A0A]">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-[#E0E0E0] text-sm font-medium tracking-wider">
            {INCIDENT.service}
          </span>
          <span className="text-[#4A4A4A] text-xs">{INCIDENT.branch}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {[
            ["BUILD", INCIDENT.buildNumber],
            ["COMMIT", INCIDENT.commit],
            ["REPO", INCIDENT.repo.split("/")[1]],
            ["BRANCH", INCIDENT.branch],
          ].map(([key, val]) => (
            <div key={key} className="flex gap-2">
              <span className="text-[#4A4A4A] text-xs tracking-widest w-14 shrink-0">
                {key}
              </span>
              <span className="text-[#E0E0E0] text-xs font-medium">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
