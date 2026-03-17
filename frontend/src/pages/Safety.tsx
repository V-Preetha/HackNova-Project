import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useAnalysis } from "../context/AnalysisContext";

export default function Safety() {
  const { partial, result } = useAnalysis();

  const stabilityTests = result?.stability_tests || partial.stability_tested?.stability_tests || [
    { test: "FGSM Attack (ε=0.01)", desc: "Fast Gradient Sign Method", confidence_change: -0.003, ok: true },
    { test: "PGD Attack (ε=0.03)", desc: "Projected Gradient Descent", confidence_change: -0.012, ok: true },
    { test: "Gaussian Noise (σ=0.05)", desc: "Random noise injection", confidence_change: -0.008, ok: true },
    { test: "Rotation (±15°)", desc: "Spatial transformation", confidence_change: -0.001, ok: true },
    { test: "Brightness Shift (±20%)", desc: "Luminance perturbation", confidence_change: -0.047, ok: false },
  ];

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide">AI Safety</h1>
        <p className="text-sm text-gray-400">Robustness testing against adversarial perturbation and noise injection</p>
      </div>

      <div className="glass-panel p-6 flex-1">
        <h2 className="text-sm tracking-widest text-gray-400 font-bold uppercase mb-6">Stability Test Results</h2>
        
        <div className="flex flex-col gap-4">
          {stabilityTests.map((test: any, i: number) => {
            const isOk = test.ok !== undefined ? test.ok : Math.abs(test.confidence_change) < 0.05;
            const changePct = (Math.abs(test.confidence_change) * 100).toFixed(1);
            
            return (
              <div 
                key={i} 
                className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                  isOk ? "bg-surface/30 border-border" : "bg-warning/10 border-warning/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  {isOk ? (
                    <CheckCircle2 className="text-primary drop-shadow-[0_0_5px_rgba(0,255,136,0.5)]" size={20} />
                  ) : (
                    <AlertTriangle className="text-warning drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" size={20} />
                  )}
                  <div>
                    <span className="font-bold text-white mr-2">{test.test}</span>
                    <span className="text-xs text-gray-500">{test.desc || "Perturbation test"}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-bold ${isOk ? "text-primary" : "text-warning"}`}>
                    Δ {changePct}%
                  </span>
                  <div className={`text-xs font-bold px-3 py-1 rounded-md border ${
                    isOk ? "bg-primary/20 border-primary/50 text-primary" : "bg-warning/20 border-warning/50 text-warning"
                  }`}>
                    {isOk ? "PASS" : "WARN"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
