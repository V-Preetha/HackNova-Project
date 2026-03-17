export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8001";

export type StreamEvent = {
  stage: string;
  [k: string]: unknown;
};

export async function getHealth() {
  const r = await fetch(`${API_BASE}/health`);
  if (!r.ok) throw new Error(`health failed: ${r.status}`);
  return r.json();
}

export async function getLogs(limit = 100) {
  const r = await fetch(`${API_BASE}/logs?limit=${encodeURIComponent(limit)}`);
  if (!r.ok) throw new Error(`logs failed: ${r.status}`);
  return r.json() as Promise<{ items: any[] }>;
}

export async function getLogById(id: string) {
  const r = await fetch(`${API_BASE}/logs/${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error(`log failed: ${r.status}`);
  return r.json();
}

export async function analyzeStream(file: File, onEvent: (ev: StreamEvent) => void) {
  const form = new FormData();
  form.append("image", file);

  const r = await fetch(`${API_BASE}/analyze/stream`, {
    method: "POST",
    body: form,
    headers: {
      Accept: "text/event-stream",
    },
  });

  if (!r.ok || !r.body) {
    const text = await r.text().catch(() => "");
    throw new Error(`stream failed: ${r.status} ${text}`);
  }

  const reader = r.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const idx = buffer.indexOf("\n\n");
      if (idx === -1) break;
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      const lines = chunk.split("\n");
      let dataLine = "";
      for (const line of lines) {
        if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;
      try {
        const ev = JSON.parse(dataLine);
        onEvent(ev);
      } catch {
        // ignore parse errors
      }
    }
  }
}

