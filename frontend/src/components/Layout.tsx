import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Activity, ShieldCheck, BarChart3, Database, History, BrainCircuit } from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/analysis", label: "Analysis", icon: Activity },
  { path: "/safety", label: "AI Safety", icon: ShieldCheck },
  { path: "/trust", label: "Trust Score", icon: BarChart3 },
  { path: "/logs", label: "Decision Logs", icon: Database },
  { path: "/history", label: "History", icon: History },
  { path: "/introspection", label: "Introspection", icon: BrainCircuit },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-gray-200">
      {/* Fixed Sidebar */}
      <aside className="w-64 min-w-[16rem] h-full flex flex-col border-r border-border bg-[#050914] z-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-primary">
              <Activity size={24} strokeWidth={2.5} />
            </span>
            <span className="text-xl font-bold tracking-wide text-white">MedTrace</span>
          </div>
          <div className="text-xs text-gray-400 tracking-widest font-semibold uppercase">AI Safety Layer</div>
        </div>

        <div className="px-4 py-2">
          <div className="text-xs text-gray-500 mb-4 px-2 tracking-wider">Navigation</div>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== "/");
              // Exception for analysis if it's the root path we shouldn't highlight both Dashboard and Analysis if we separate them later.
              // For now, let's keep exact match mostly.
              const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm font-medium",
                    isActive 
                      ? "bg-surface text-white shadow-[inset_3px_0_0_#00ff88]" 
                      : "text-gray-400 hover:text-gray-200 hover:bg-surface/50"
                  )}
                >
                  <item.icon 
                    size={18} 
                    className={clsx(
                      "transition-colors duration-200",
                      isActive ? "text-primary drop-shadow-[0_0_5px_rgba(0,255,136,0.6)]" : "text-gray-500 group-hover:text-gray-400"
                    )} 
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6">
          <div className="flex items-center gap-2 text-xs font-bold text-primary px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,255,136,0.8)]" />
            SYSTEM ACTIVE
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-[#02040A] relative overflow-hidden medtrace-scrollbar">
        {/* Dark Grid Background effect (optional subtlety) */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: "radial-gradient(#1f2937 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        
        {/* Scrollable container for the page */}
        <div className="flex-1 overflow-y-auto w-full relative z-10 p-8 h-full medtrace-scrollbar">
          <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
