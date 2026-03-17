type StageStatus = "pending" | "active" | "done" | "error";

export type StageItem = {
  key: string;
  label: string;
  status: StageStatus;
};

export default function StageTimeline({ items }: { items: StageItem[] }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((it) => (
        <div
          key={it.key}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: "10px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            background:
              it.status === "done" ? "#f0fdf4" : it.status === "error" ? "#fef2f2" : it.status === "active" ? "#eff6ff" : "white",
          }}
        >
          <div style={{ width: 110, fontWeight: 700, fontSize: 12, color: "#111827" }}>{it.label}</div>
          <div style={{ fontSize: 13, color: "#374151" }}>
            {it.status === "pending" && "Waiting…"}
            {it.status === "active" && "Running…"}
            {it.status === "done" && "Done"}
            {it.status === "error" && "Error"}
          </div>
        </div>
      ))}
    </div>
  );
}

