import { useMemo, useState } from "react";
import StageTimeline, { StageItem } from "../components/StageTimeline";
import { analyzeStream, API_BASE, StreamEvent } from "../lib/api";

type Result = {
  prediction: string;
  confidence: number;
  trust_score: number;
  risk_level: string;
  stability_score: number;
  prediction_variance: number;
  instability_flag: boolean;
  adversarial_score: number;
  tampering_flag: boolean;
  heatmap_url: string;
  overlay_url?: string;
  decision_trace: Array<{ step: string }>;
  introspection: any;
  log_id: string;
};

const STAGES = [
  { key: "upload_validated", label: "Upload" },
  { key: "preprocessed", label: "Preprocess" },
  { key: "predicted", label: "Predict" },
  { key: "explained", label: "Explain" },
  { key: "stability_tested", label: "Stability" },
  { key: "adversarial_checked", label: "Tampering" },
  { key: "trust_evaluated", label: "Trust" },
  { key: "logged", label: "Log" },
  { key: "done", label: "Done" },
];

export default function Analyze() {
  const [file, setFile] = useState<File | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [partial, setPartial] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);

  const timeline: StageItem[] = useMemo(() => {
    const seenDone = new Set(Object.keys(partial));
    return STAGES.map((s) => {
      let status: StageItem["status"] = "pending";
      if (error && (activeStage === "error" || s.key === activeStage)) status = "error";
      else if (seenDone.has(s.key)) status = "done";
      else if (activeStage === s.key) status = "active";
      return { ...s, status };
    });
  }, [partial, activeStage, error]);

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

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Analyze</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>Upload an X-ray and watch MedTrace progressively reveal its decision.</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={busy}
          />
          <button
            onClick={onAnalyze}
            disabled={!file || busy}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: busy ? "#e5e7eb" : "#111827",
              color: busy ? "#111827" : "white",
              fontWeight: 800,
              cursor: busy ? "default" : "pointer",
            }}
          >
            {busy ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 10, color: "#991b1b" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 16, alignItems: "start" }}>
        <StageTimeline items={timeline} />

        <div style={{ display: "grid", gap: 12 }}>
          {partial.predicted && (
            <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Prediction</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{String((partial.predicted as any).prediction)}</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                Confidence: {(Number((partial.predicted as any).confidence) * 100).toFixed(1)}%
              </div>
            </div>
          )}

          {partial.explained && (
            <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Explainability</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 6 }}>Heatmap</div>
                  <img
                    alt="heatmap"
                    src={`${API_BASE}${String((partial.explained as any).heatmap_url)}`}
                    style={{ width: 260, borderRadius: 10, border: "1px solid #e5e7eb" }}
                  />
                </div>
                {(partial.explained as any).overlay_url && (
                  <div>
                    <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 6 }}>Overlay</div>
                    <img
                      alt="overlay"
                      src={`${API_BASE}${String((partial.explained as any).overlay_url)}`}
                      style={{ width: 260, borderRadius: 10, border: "1px solid #e5e7eb" }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {partial.stability_tested && (
            <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Stability</div>
              <div style={{ color: "#111827" }}>
                Stability score: {Number((partial.stability_tested as any).stability_score).toFixed(3)}
              </div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                Variance: {Number((partial.stability_tested as any).prediction_variance).toFixed(4)} • Instability:{" "}
                {String((partial.stability_tested as any).instability_flag)}
              </div>
            </div>
          )}

          {partial.adversarial_checked && (
            <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Tampering / Adversarial</div>
              <div style={{ color: "#111827" }}>
                Adversarial score: {Number((partial.adversarial_checked as any).adversarial_score).toFixed(3)}
              </div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                Tampering flag: {String((partial.adversarial_checked as any).tampering_flag)}
              </div>
            </div>
          )}

          {partial.trust_evaluated && (
            <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Trust</div>
              <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{String((partial.trust_evaluated as any).trust_score)}</div>
                <div style={{ color: "#6b7280" }}>Risk level: {String((partial.trust_evaluated as any).risk_level)}</div>
              </div>
              {(partial.trust_evaluated as any).trust_breakdown && (
                <pre style={{ marginTop: 10, padding: 10, background: "#f9fafb", borderRadius: 10, overflowX: "auto" }}>
                  {JSON.stringify((partial.trust_evaluated as any).trust_breakdown, null, 2)}
                </pre>
              )}
            </div>
          )}

          {result && (
            <div style={{ padding: 14, border: "1px solid #111827", borderRadius: 12, background: "#111827", color: "white" }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Replay ready</div>
              <div style={{ color: "#d1d5db", fontSize: 13, marginBottom: 10 }}>Log ID: {result.log_id}</div>
              <a href={`/replay/${result.log_id}`} style={{ color: "white", fontWeight: 900, textDecoration: "underline" }}>
                View full decision replay →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

