import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { analyzeStream, StreamEvent } from "../lib/api";

type Result = {
  prediction: string;
  confidence: number;
  class_probabilities?: Record<string, number>;
  trust_score: number;
  risk_level: string;
  stability_score: number;
  stability_tests?: Array<{
    test: string;
    baseline_confidence: number;
    perturbed_confidence: number;
    confidence_change: number;
  }>;
  prediction_variance: number;
  instability_flag: boolean;
  entropy?: number;
  uncertainty_level?: string;
  adversarial_score: number;
  tampering_flag: boolean;
  heatmap_url: string;
  overlay_url?: string;
  focus_regions?: any[];
  decision_trace: Array<{ step: string }>;
  introspection: any;
  report?: any;
  log_id: string;
};

export const STAGES = [
  { key: "upload_validated", label: "Upload" },
  { key: "preprocessed", label: "Scan" },
  { key: "predicted", label: "Predict" },
  { key: "explained", label: "Heatmap" },
  { key: "stability_tested", label: "Integrity" },
  { key: "adversarial_checked", label: "Trust" },
  { key: "trust_evaluated", label: "Log" },
  { key: "logged", label: "Done" },
];

type AnalysisContextType = {
  file: File | null;
  setFile: (file: File | null) => void;
  activeStage: string | null;
  error: string | null;
  result: Result | null;
  partial: Record<string, any>;
  busy: boolean;
  onAnalyze: () => Promise<void>;
  reset: () => void;
};

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [partial, setPartial] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFile(null);
    setActiveStage(null);
    setError(null);
    setResult(null);
    setPartial({});
    setBusy(false);
  };

  async function onAnalyze() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setPartial({});
    setActiveStage("upload_validated");

    try {
      await analyzeStream(file, (ev: StreamEvent) => {
        const stage = String(ev.stage || "");
        setActiveStage(stage);
        setPartial((p) => ({ ...p, [stage]: ev }));

        if (stage === "done" && typeof ev.result === "object" && ev.result) {
          setResult(ev.result as Result);
        }
        if (stage === "error") {
          setError(String((ev as any).message || "Unknown error"));
        }
      });
    } catch (e: any) {
      setError(e?.message || "Stream failed");
    } finally {
      setBusy(false);
    }
  }

  const value = useMemo(
    () => ({
      file,
      setFile,
      activeStage,
      error,
      result,
      partial,
      busy,
      onAnalyze,
      reset,
    }),
    [file, activeStage, error, result, partial, busy]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) throw new Error("useAnalysis must be used within an AnalysisProvider");
  return context;
}

export type { Result };
