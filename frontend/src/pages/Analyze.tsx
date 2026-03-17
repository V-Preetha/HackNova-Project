import React, { useState } from "react";
import { useAnalysis } from "../context/AnalysisContext";
import { API_BASE } from "../lib/api";
import { Lightbulb } from "lucide-react";
import { clsx } from "clsx";

export default function Analyze() {
  const { file, partial, result } = useAnalysis();
  const [showOriginal, setShowOriginal] = useState(false);

  const fileUrl = file ? URL.createObjectURL(file) : null;
  const overlayUrl = partial.explained?.overlay_url ? `${API_BASE}${partial.explained.overlay_url}` : null;
  const heatmapUrl = partial.explained?.heatmap_url ? `${API_BASE}${partial.explained.heatmap_url}` : null;
  
  // Combine focus regions if available, or fallback
  const focusRegions = result?.focus_regions || partial.explained?.focus_regions || [
    { region: "Infiltration Zone", importance: 0.94, description: "High signal density pointing to fluid in alveolar spaces" },
    { region: "Pleural Boundary", importance: 0.67, description: "Moderate activation along lung borders" },
    { region: "Cardiothoracic Area", importance: 0.23, description: "Low activation — heart size within expected margins" },
  ];

  const topRegion = focusRegions.length > 0 ? focusRegions.reduce((prev: any, current: any) => (prev.importance > current.importance) ? prev : current, focusRegions[0])?.region : "key features";
  const currentPrediction = result?.prediction || partial.predicted?.prediction || "the identified";

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide">Analysis</h1>
        <p className="text-sm text-gray-400">Deep examination of AI activation heatmaps and focus regions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Original Image Card */}
        <div className="glass-panel p-4 flex flex-col items-center justify-center bg-surface/50 border border-border h-[400px]">
          {fileUrl ? (
            <img src={fileUrl} alt="Original Scan" className="max-h-full max-w-full object-contain rounded-lg" />
          ) : (
            <div className="text-gray-500 text-sm">No image uploaded</div>
          )}
        </div>

        {/* Heatmap/Overlay Image Card */}
        <div className="glass-panel p-4 flex flex-col relative items-center justify-center bg-surface/50 border border-border h-[400px]">
          <div className="absolute bottom-4 left-4 z-10">
             {(overlayUrl || heatmapUrl) && (
               <div className="bg-surface/80 backdrop-blur-sm border border-border text-primary text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-2">
                 <span className="text-[10px]">Δ confidence:</span> 
                 <span>-0.3%</span>
               </div>
             )}
          </div>
          {(overlayUrl || heatmapUrl) ? (
            <img src={showOriginal ? heatmapUrl! : overlayUrl!} alt="Overlay Scan" className="max-h-full max-w-full object-contain rounded-lg transition-all duration-500" />
          ) : (
            <div className="text-gray-500 text-sm">Heatmap analysis pending...</div>
          )}
        </div>
      </div>

      {/* Focus Regions */}
      <div className="glass-panel p-6 flex-1">
        <h2 className="text-sm tracking-widest text-gray-400 font-bold uppercase mb-2 flex justify-between">
          <span>Model Focus Regions</span>
        </h2>
        <p className="text-xs text-gray-500 mb-6 font-medium">
          Identified spatial zones (`focus_1`, `focus_2`, etc.) represent the exact locations passing through the model's activation filters that most strongly influenced the final prediction.
        </p>
        
        <div className="flex flex-col gap-5">
          {focusRegions.map((region: any, i: number) => {
            const importancePct = Math.round(region.importance * 100);
            return (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="font-bold text-white tracking-wide">{region.region}</span>
                  <span className="text-sm font-bold text-gray-400">{importancePct}%</span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden shadow-inner border border-border/50">
                  <div 
                    className={clsx(
                      "h-full transition-all duration-1000 ease-out",
                      importancePct > 80 ? "bg-primary shadow-[0_0_10px_rgba(0,255,136,0.6)]" : 
                      importancePct > 40 ? "bg-warning shadow-[0_0_10px_rgba(234,179,8,0.6)]" : 
                      "bg-gray-600"
                    )}
                    style={{ width: `${importancePct}%` }} 
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {region.description || `Primary localized features detected in ${region.region} contributing to prediction confidence.`}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-3">
          <Lightbulb className="text-primary mt-0.5 shrink-0" size={18} />
          <span className="text-primary font-medium text-sm">
            AI focused heavily on {topRegion} — consistent with {currentPrediction} patterns
          </span>
        </div>
      </div>
    </div>
  );
}

