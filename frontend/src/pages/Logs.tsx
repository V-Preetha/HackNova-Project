import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLogs } from "../lib/api";

type LogRow = {
  log_id: string;
  created_at: string;
  prediction: string;
  confidence: number;
  trust_score: number;
  risk_level: string;
  image_hash: string;
};

export default function Logs() {
  const [items, setItems] = useState<LogRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLogs(200)
      .then((r) => setItems(r.items as any))
      .catch((e) => setError(e?.message || "Failed to load logs"));
  }, []);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Logs</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>Immutable case history (append-only), with replay.</div>
      </div>

      {error && (
        <div style={{ padding: 12, border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 10, color: "#991b1b" }}>
          {error}
        </div>
      )}

      <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", textAlign: "left" }}>
              <th style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>Time</th>
              <th style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>Prediction</th>
              <th style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>Trust</th>
              <th style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>Risk</th>
              <th style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>Replay</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.log_id}>
                <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6", color: "#6b7280", fontSize: 12 }}>
                  {new Date(it.created_at).toLocaleString()}
                </td>
                <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6", fontWeight: 800 }}>{it.prediction}</td>
                <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>{it.trust_score}</td>
                <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>{it.risk_level}</td>
                <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>
                  <Link to={`/replay/${it.log_id}`}>Open</Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 14, color: "#6b7280" }}>
                  No logs yet. Run an analysis first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

