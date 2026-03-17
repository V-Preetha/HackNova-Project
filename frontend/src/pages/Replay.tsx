import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE, getLogById } from "../lib/api";

export default function Replay() {
  const { id } = useParams();
  const [row, setRow] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const basename = (p: string) => p.split(/[\\/]/).slice(-1)[0];

  useEffect(() => {
    if (!id) return;
    getLogById(id)
      .then((r) => setRow(r))
      .catch((e) => setError(e?.message || "Failed to load replay"));
  }, [id]);

  if (error) {
    return (
      <div style={{ padding: 12, border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 10, color: "#991b1b" }}>
        {error}
      </div>
    );
  }
  if (!row) return <div style={{ color: "#6b7280" }}>Loading…</div>;

  const decisionTrace = (() => {
    try {
      return JSON.parse(row.decision_trace_json || "[]") as Array<{ step: string }>;
    } catch {
      return [];
    }
  })();

  const introspection = (() => {
    try {
      return JSON.parse(row.introspection_json || "{}");
    } catch {
      return {};
    }
  })();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Replay</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>Reconstruct the full decision pipeline for this case.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Artifacts</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {row.heatmap_path && (
              <div>
                <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 6 }}>Heatmap</div>
                <img
                  alt="heatmap"
                  src={`${API_BASE}/static/heatmaps/${basename(String(row.heatmap_path))}`}
                  style={{ width: 300, borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </div>
            )}
            {row.overlay_path && (
              <div>
                <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 6 }}>Overlay</div>
                <img
                  alt="overlay"
                  src={`${API_BASE}/static/heatmaps/${basename(String(row.overlay_path))}`}
                  style={{ width: 300, borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Metrics</div>
          <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
            <div>
              <b>Prediction:</b> {row.prediction}
            </div>
            <div>
              <b>Confidence:</b> {(Number(row.confidence) * 100).toFixed(1)}%
            </div>
            <div>
              <b>Stability:</b> {Number(row.stability_score).toFixed(3)} (var {Number(row.prediction_variance).toFixed(4)}) •{" "}
              {row.instability_flag ? "unstable" : "stable"}
            </div>
            <div>
              <b>Adversarial:</b> {Number(row.adversarial_score).toFixed(3)} • {row.tampering_flag ? "tampering suspected" : "ok"}
            </div>
            <div>
              <b>Trust score:</b> {row.trust_score} • <b>Risk:</b> {row.risk_level}
            </div>
            <div>
              <b>Image hash:</b> <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{row.image_hash}</span>
            </div>
            <div>
              <b>Ledger verification:</b> {row.ledger_ok ? "OK" : "BROKEN"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Decision trace</div>
          <ol style={{ margin: 0, paddingLeft: 18, color: "#111827" }}>
            {decisionTrace.map((s: any, idx) => (
              <li key={idx} style={{ marginBottom: 6 }}>
                {typeof s === "string" ? s : s?.step}
              </li>
            ))}
          </ol>
        </div>
        <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Introspection</div>
          <pre style={{ margin: 0, padding: 12, background: "#f9fafb", borderRadius: 10, overflowX: "auto" }}>
            {JSON.stringify(introspection, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

