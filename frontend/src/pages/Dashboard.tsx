import React, { useState } from "react";
import { Upload, Sparkles, ShieldCheck, AlertTriangle, LayoutDashboard } from "lucide-react";
import { clsx } from "clsx";
import PipelineStepper from "../components/PipelineStepper";
import { useAnalysis } from "../context/AnalysisContext";
import { API_BASE } from "../lib/api";

function CircularProgress({ value, colorClass }: { value: number; colorClass: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="transform -rotate-90 w-24 h-24">
        <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-surface" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={clsx("transition-all duration-1000 ease-out", colorClass)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold text-white">{value}</span>
        <span className="text-[10px] text-gray-400">Trust Score</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { file, setFile, activeStage, partial, busy, onAnalyze, result, error } = useAnalysis();
  const [showHeatmap, setShowHeatmap] = useState(false);

  const fileUrl = file ? URL.createObjectURL(file) : null;
  
  const heatmapUrl = partial.explained?.heatmap_url ? `${API_BASE}${partial.explained.heatmap_url}` : null;
  const displayImageUrl = showHeatmap && heatmapUrl ? heatmapUrl : fileUrl;

  const prediction = result?.prediction || partial.predicted?.prediction || "--";
  const confidence = result?.confidence || partial.predicted?.confidence || 0;
  const confidencePercent = (confidence * 100).toFixed(1);

  const isComplete = !!result;

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/20 border border-primary flex items-center justify-center text-primary shadow-[0_0_10px_rgba(0,255,136,0.2)]">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">Dashboard</h1>
            <p className="text-sm text-gray-400">Upload scans and view AI safety analysis overview</p>
          </div>
        </div>
      </div>

      <PipelineStepper />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        {/* Left Column: Image Input */}
        <div className="glass-panel p-6 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm tracking-widest text-gray-400 font-bold uppercase">Input Image</h2>
            {heatmapUrl && (
              <button 
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-xs font-bold transition-all border",
                  showHeatmap 
                    ? "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(0,255,136,0.2)]" 
                    : "bg-surface border-border text-gray-400 hover:text-white"
                )}
              >
                Heatmap
              </button>
            )}
          </div>
          <div className="flex-1 bg-surface rounded-xl border border-border/50 relative overflow-hidden flex items-center justify-center group overflow-hidden">
            {displayImageUrl ? (
              <img 
                src={displayImageUrl} 
                alt="Scan" 
                className="w-full h-full object-cover transition-opacity duration-500"
              />
            ) : (
              <div className="text-center p-6 text-gray-500 flex flex-col items-center">
                <Upload size={32} className="mb-3 opacity-50" />
                <p className="text-sm mb-4">No image uploaded</p>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={busy}
                />
                <label 
                  htmlFor="file-upload" 
                  className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-white font-medium cursor-pointer hover:bg-border transition-colors shadow-sm"
                >
                  Browse Files
                </label>
              </div>
            )}

            {/* Scanning Overlay Animation */}
            {busy && !isComplete && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-100%] w-full h-[50%] bg-gradient-to-b from-transparent to-primary/20 animate-[scan_2s_ease-in-out_infinite] border-b border-primary/50 shadow-[0_5px_15px_rgba(0,255,136,0.3)]"></div>
              </div>
            )}
            
            {/* Analyze Button Overlay when file is selected but not running */}
            {file && !busy && !isComplete && !error && (
              <div className="absolute inset-x-0 bottom-6 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={onAnalyze}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-background font-bold tracking-wide rounded-full shadow-[0_0_20px_rgba(0,255,136,0.6)] hover:bg-white transition-colors"
                >
                  <Sparkles size={18} />
                  Run Analysis
                </button>
              </div>
            )}
          </div>
          {error && (
            <div className="mt-4 p-3 border border-danger/50 bg-danger/10 text-danger rounded-lg text-sm flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Prediction & Cards */}
        <div className="flex flex-col gap-6 h-[500px]">
          {/* Prediction Output */}
          <div className="glass-panel p-6 flex-1 flex flex-col">
            <h2 className="text-sm tracking-widest text-gray-400 font-bold uppercase mb-6">Prediction Output</h2>
            
            <div className="grid grid-cols-[1fr_120px] gap-4 mb-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Classification</div>
                <div className="text-3xl font-black text-primary drop-shadow-[0_0_8px_rgba(0,255,136,0.5)] tracking-wide">
                  {prediction}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">Confidence</div>
                <div className="text-2xl font-bold text-white">{confidencePercent}%</div>
              </div>
            </div>

            {/* Main Confidence Bar */}
            <div className="h-2 w-full bg-surface rounded-full overflow-hidden mb-8 shadow-inner border border-border/50">
              <div 
                className="h-full bg-primary shadow-[0_0_10px_rgba(0,255,136,0.8)] transition-all duration-1000 ease-out" 
                style={{ width: `${confidence * 100}%` }} 
              />
            </div>

            {/* Other Class Probabilities (if available) */}
            <div className="flex-1 min-h-0">
              {partial.predicted?.class_probabilities && (
                <div className="grid grid-cols-3 gap-3 h-full content-end">
                  {Object.entries(partial.predicted.class_probabilities as Record<string, number>)
                    .filter(([k]) => k !== prediction)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([k, v]) => (
                      <div key={k} className="bg-surface/50 border border-border rounded-lg p-3 text-center flex flex-col justify-center">
                        <div className="text-xs text-gray-400 truncate w-full">{k}</div>
                        <div className="text-sm font-bold text-gray-200 mt-1">{(v * 100).toFixed(1)}%</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom row: Integrity + Trust Score */}
          <div className="grid grid-cols-2 gap-6 h-40">
            <div className="glass-panel p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary shadow-[0_0_15px_rgba(0,255,136,0.4)] shrink-0">
                <ShieldCheck size={28} />
              </div>
              <div>
                {partial.adversarial_checked ? (
                  <>
                    <div className="font-bold text-lg text-white">Integrity Verified</div>
                    <div className="text-xs text-gray-400 mt-1 leading-snug">No adversarial perturbations detected</div>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-lg text-gray-500">Pending...</div>
                    <div className="text-xs text-gray-600 mt-1 leading-snug">Awaiting adversarial check</div>
                  </>
                )}
              </div>
            </div>

            <div className="glass-panel p-4 flex flex-col items-center justify-center relative overflow-hidden">
              {/* Optional background glow matching score */}
              {partial.trust_evaluated && (
                <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-xl z-0 pointer-events-none" />
              )}
              <div className="z-10 w-full flex items-center justify-center">
                <CircularProgress 
                  value={partial.trust_evaluated ? result?.trust_score ?? partial.trust_evaluated.trust_score ?? 0 : 0} 
                  colorClass={(partial.trust_evaluated ? ((result?.trust_score ?? partial.trust_evaluated.trust_score ?? 0) > 75 ? "text-primary" : "text-warning") : "text-gray-600")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


