import React from "react";
import { BrainCircuit, AlertTriangle } from "lucide-react";

function ActivationBar({ label, desc, pct, colorClass="bg-primary shadow-[0_0_10px_rgba(0,255,136,0.5)]" }: any) {
  return (
    <div className="flex gap-4 items-center">
      <div className="w-16 text-right">
        <span className="text-primary font-mono text-sm font-bold">Conv1</span>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="font-bold text-gray-200 mb-1 leading-none">{label}</div>
        <div className="text-xs text-gray-500 mb-2">{desc}</div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-full bg-surface rounded-full overflow-hidden shadow-inner border border-border/50">
            <div className={`h-full transition-all duration-1000 ease-out ${colorClass}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-gray-500 font-mono w-8 text-right">{pct.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

export default function Introspection() {
  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
          <BrainCircuit className="text-primary" size={28} /> Model Introspection
        </h1>
        <p className="text-sm text-gray-400 mt-1">Deep neural network behavior analysis during inference</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="glass-panel p-6">
          <h2 className="text-sm tracking-widest text-gray-400 font-bold uppercase mb-8 flex items-center gap-2">
            Layer-wise Activation Flow
          </h2>

          <div className="flex flex-col gap-6 pl-4 border-l border-border/50">
            <ActivationBar label="Edge Detection" desc="Basic edges and gradients detected" pct={43.6} />
            <ActivationBar label="Texture Patterns" desc="Repeating texture motifs identified" pct={64.6} />
            <ActivationBar label="Shape Recognition" desc="Anatomical structures forming" pct={69.7} />
            <ActivationBar label="Feature Assembly" desc="High-level feature maps converging" pct={84.3} />
            <ActivationBar label="Class Activation" desc="Strong signal in target class" pct={94.8} />
            <ActivationBar label="Decision Layer" desc="Final classification boundaries" pct={99.7} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pb-12">
           <div className="glass-panel p-6">
             <h2 className="text-sm tracking-widest flex items-center gap-2 text-warning font-bold uppercase mb-6">
               <AlertTriangle size={16} /> Instability Detection
             </h2>

             <div className="flex flex-col gap-5">
               {[
                 { layer: "Layer 3", val: 2.1, max: 15, status: "STABLE", color: "bg-primary" },
                 { layer: "Layer 5", val: 3.8, max: 15, status: "STABLE", color: "bg-primary" },
                 { layer: "Layer 7", val: 12.4, max: 15, status: "UNSTABLE", color: "bg-danger" },
                 { layer: "Layer 9", val: 5.2, max: 15, status: "MODERATE", color: "bg-warning" },
                 { layer: "Layer 11", val: 1.9, max: 15, status: "STABLE", color: "bg-primary" },
               ].map((item, i) => (
                 <div key={i} className="flex items-center gap-4">
                   <div className="text-white font-bold font-mono w-20 text-sm">{item.layer}</div>
                   <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                     <div className={`h-full ${item.color} shadow-[0_0_8px_currentColor]`} style={{ width: `${(item.val/15)*100}%` }} />
                   </div>
                   <div className="text-xs text-gray-500 w-12 text-right tracking-wider font-mono">σ={item.val.toFixed(1)}</div>
                   <div className={`text-[10px] font-bold px-2 py-0.5 rounded border tracking-wider w-20 text-center ${
                     item.status === "STABLE" ? "text-primary border-primary/30" : 
                     item.status === "UNSTABLE" ? "text-danger border-danger/30" : "text-warning border-warning/30"
                   }`}>
                     {item.status}
                   </div>
                 </div>
               ))}
             </div>

             <div className="mt-6 p-4 border border-danger/30 bg-danger/5 rounded-lg text-sm text-danger flex gap-2">
               <AlertTriangle size={16} className="mt-0.5 shrink-0" />
               Layer 7 shows high variance (σ=12.4) → model uncertainty detected in intermediate feature extraction
             </div>
           </div>

           <div className="glass-panel p-6 flex flex-col">
             <h2 className="text-sm tracking-widest flex items-center gap-2 text-gray-300 font-bold uppercase mb-8">
               Decision Path Complexity
             </h2>

             {/* Grade indicator */}
             <div className="w-full relative h-3 rounded-full bg-surface border border-border/50 mb-2 overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-primary via-warning to-danger opacity-80" />
               <div className="absolute right-[32%] top-0 bottom-0 w-1 bg-white z-10 shadow-[0_0_5px_white]" />
               <div className="absolute right-0 top-0 bottom-0 w-[32%] bg-surface z-20" />
             </div>
             
             <div className="flex justify-between text-[10px] text-gray-500 font-medium uppercase mb-8">
               <span>Simple</span>
               <span>Moderate</span>
               <span>Complex</span>
             </div>

             <div className="flex-1 flex flex-col items-center justify-center">
                <div className="text-4xl font-black text-warning drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] mb-2">68%</div>
                <div className="text-gray-400 text-sm">Moderate-High Complexity</div>
             </div>

             <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg text-sm text-warning/90 mt-auto">
               Model required multiple feature refinements across 4 convolutional blocks before reaching classification certainty
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

