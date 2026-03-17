import React from "react";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import { useAnalysis, STAGES } from "../context/AnalysisContext";

export default function PipelineStepper() {
  const { activeStage, partial, error } = useAnalysis();

  // If no stages are active or error occurred without stage, maybe hide or show default
  return (
    <div className="w-full flex items-center justify-between px-4 py-4 mb-6 relative">
      <div className="absolute left-[3rem] right-[3rem] top-1/2 -translate-y-1/2 h-[1px] bg-border z-0" />
      
      {STAGES.slice(0, 7).map((stage, idx) => {
        const seenDone = new Set(Object.keys(partial));
        let status: "pending" | "active" | "done" | "error" = "pending";
        
        if (error && (activeStage === "error" || stage.key === activeStage)) status = "error";
        else if (seenDone.has(stage.key)) status = "done";
        else if (activeStage === stage.key) status = "active";

        return (
          <div key={stage.key} className="flex items-center gap-2 bg-[#02040A] z-10 px-2">
            <div
              className={clsx(
                "w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-bold transition-all duration-300",
                status === "done" && "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(0,255,136,0.3)]",
                status === "active" && "bg-surface border-primary text-primary animate-pulse shadow-[0_0_15px_rgba(0,255,136,0.6)]",
                status === "pending" && "bg-surface border-border text-gray-500",
                status === "error" && "bg-danger/20 border-danger text-danger"
              )}
            >
              {status === "done" ? <Check size={12} strokeWidth={3} /> : idx + 1}
            </div>
            <span
              className={clsx(
                "text-xs tracking-wide font-medium transition-colors",
                (status === "done" || status === "active") ? "text-gray-200" : "text-gray-600",
                status === "active" && "text-primary glow-text"
              )}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
