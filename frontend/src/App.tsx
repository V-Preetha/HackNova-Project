import { Link, Route, Routes } from "react-router-dom";
import Analyze from "./pages/Analyze";
import Logs from "./pages/Logs";
import Replay from "./pages/Replay";

const Nav = () => {
  return (
    <div style={{ display: "flex", gap: 12, padding: 16, borderBottom: "1px solid #e5e7eb" }}>
      <Link to="/" style={{ fontWeight: 700, textDecoration: "none" }}>
        MedTrace
      </Link>
      <div style={{ flex: 1 }} />
      <Link to="/" style={{ textDecoration: "none" }}>
        Analyze
      </Link>
      <Link to="/logs" style={{ textDecoration: "none" }}>
        Logs
      </Link>
    </div>
  );
};

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <Nav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <Routes>
          <Route path="/" element={<Analyze />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/replay/:id" element={<Replay />} />
        </Routes>
      </div>
    </div>
  );
}

