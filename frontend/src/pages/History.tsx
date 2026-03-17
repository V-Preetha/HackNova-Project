import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLogs } from "../lib/api";
import { ShieldCheck, AlertTriangle, History as HistoryIcon } from "lucide-react";

type LogRow = {
  log_id: string;
  created_at: string;
  prediction: string;
  confidence: number;
  trust_score: number;
  risk_level: string;
  image_hash: string;
};

export default function History() {
  const [items, setItems] = useState<LogRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLogs(200)
      .then((r) => setItems(r.items as any))
      .catch((e) => setError(e?.message || "Failed to load history"));
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3">
          <HistoryIcon className="text-primary" /> History
        </h1>
        <p className="text-sm text-gray-400">Previous analysis cases — click to replay the full pipeline</p>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-danger/50 bg-danger/10 text-danger rounded-xl text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {items.map((it, idx) => {
          const isSafe = it.risk_level === "SAFE";
          return (
            <Link 
              key={it.log_id} 
              to={`/replay/${it.log_id}`}
              className="glass-panel p-4 flex items-center justify-between hover:border-primary/50 hover:bg-surface transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#02040A] rounded-lg border border-border/50 flex items-center justify-center overflow-hidden">
                  <span className="text-xs text-gray-600 font-mono text-[10px] break-all px-1 text-center">
                    {it.image_hash?.slice(0, 16)}...
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 font-mono tracking-wider">case-{idx.toString().padStart(3, '0')}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{new Date(it.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-lg font-bold text-white tracking-wide">{it.prediction}</div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-400">Confidence: <strong className="text-gray-200">{(it.confidence * 100).toFixed(1)}%</strong></span>
                    <span className="text-xs text-gray-400">Trust: <strong className="text-gray-200">{it.trust_score}</strong></span>
                  </div>
                </div>
              </div>

              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-bold ${
                isSafe ? "bg-primary/10 border-primary/30 text-primary" : "bg-warning/10 border-warning/30 text-warning"
              }`}>
                {isSafe ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                {it.risk_level}
              </div>
            </Link>
          );
        })}

        {items.length === 0 && !error && (
          <div className="text-center p-12 text-gray-500 border border-border rounded-xl">
            No history available. Run an analysis first.
          </div>
        )}
      </div>
    </div>
  );
}

