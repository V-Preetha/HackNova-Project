import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Analyze from "./pages/Analyze";
import Logs from "./pages/Logs";
import Replay from "./pages/Replay";
import Dashboard from "./pages/Dashboard";
import Safety from "./pages/Safety";
import Trust from "./pages/Trust";
import History from "./pages/History";
import Introspection from "./pages/Introspection";
import { AnalysisProvider } from "./context/AnalysisContext";

export default function App() {
  return (
    <AnalysisProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analysis" element={<Analyze />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/trust" element={<Trust />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/history" element={<History />} />
          <Route path="/introspection" element={<Introspection />} />
          <Route path="/replay/:id" element={<Replay />} />
        </Routes>
      </Layout>
    </AnalysisProvider>
  );
}

