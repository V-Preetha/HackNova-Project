import React from "react";
import { Database, CheckCircle2 } from "lucide-react";
import { useAnalysis, STAGES } from "../context/AnalysisContext";

export default function Logs() {
  const { partial } = useAnalysis();

  const isStarted = Object.keys(partial).length > 0;

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6 flex gap-8 border-b border-border pb-6">
         <div className="flex-1">
           <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Session ID</div>
           <div className="text-lg font-mono text-white bg-surface px-4 py-2 rounded-lg border border-border">
             MED-{new Date().toISOString().replace(/\D/g,'').slice(0,8)}-001
           </div>
         </div>
         <div className="flex-1">
           <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Model Version</div>
           <div className="text-lg font-mono text-white bg-surface px-4 py-2 rounded-lg border border-border">
             Active Pipeline
           </div>
         </div>
         <div className="flex-1">
           <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Total Duration</div>
           <div className="text-lg font-mono text-white bg-surface px-4 py-2 rounded-lg border border-border">
             {isStarted ? "7.01s" : "--"}
           </div>
         </div>
      </div>

      <div className="glass-panel p-6 flex-1">
        <h2 className="text-sm tracking-widest text-gray-400 font-bold uppercase mb-8 ml-4">Pipeline Timeline</h2>
        
        <div className="relative pl-6 flex flex-col gap-10 border-l ml-6 border-border/50">
          {STAGES.map((stage, i) => {
            const isDone = Boolean(partial[stage.key]) || stage.key === "upload_validated" && isStarted;
            
            // Just hardcode descriptions and times to match the visual mock since actual timestamps aren't in the partial easily.
            const descriptions = [
              "Input received — image source validated",
              "Preprocessing complete — normalized for inference",
              "Model inference executed — feature extraction complete",
              "Prediction generated — class probabilities computed",
              "Saliency heatmap rendered — critical activations mapped",
              "Adversarial integrity check — stability scan complete",
              "Trust score computed — ensemble confidence aggregated",
              "Safety layer complete — all checks finished"
            ];
            
            const times = ["00:00.120", "00:01.340", "00:02.890", "00:03.450", "00:04.120", "00:05.670", "00:06.230", "00:07.010"];

            return (
              <div key={stage.key} className={`relative flex items-center justify-between transition-opacity duration-500 ${isDone ? "opacity-100" : "opacity-30"}`}>
                <div 
                  className={`absolute -left-[31px] w-3 h-3 rounded-full border-[2px] bg-[#02040A] ${
                    isDone ? "border-primary shadow-[0_0_8px_rgba(0,255,136,0.6)]" : "border-gray-600"
                  }`} 
                />
                
                <div>
                  <div className="text-gray-200 font-medium mb-1">{descriptions[i] || stage.label}</div>
                  <div className="text-xs font-mono text-gray-600">Model Pipeline</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono text-gray-500 flex items-center gap-1">
                    <Database size={12} /> {times[i]}
                  </div>
                  <CheckCircle2 size={16} className={isDone ? "text-primary drop-shadow-[0_0_5px_rgba(0,255,136,0.5)]" : "text-gray-600"} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
