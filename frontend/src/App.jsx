import React from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import MapaInteractivo from "./pages/MapaInteractivo";
import Alertas from "./pages/Alertas";
import Images from "./pages/Images";
import GraficoSensores from "./pages/GraficoSensores";

export default function App() {
  // view: current active page key
  const [view, setView] = React.useState("dashboard");

  // collapsed: sidebar compact state (persisted)
  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem("sidebar.collapsed") === "true";
    } catch {
      return false;
    }
  });

  // lastUpdated: dynamic timestamp (update when user presses refresh)
  const [lastUpdated, setLastUpdated] = React.useState(null);

  // example user (avatar or initials)
  const user = { name: "Dr. Carlos Mendoza", initials: "CM", avatar: null };

  // refresh handler (could call backend here)
  const handleRefresh = async () => {
    // simulate update (replace with real API call)
    setLastUpdated(new Date());
    // e.g. await api.fetchLatest();
  };

  // save collapsed state
  React.useEffect(() => {
    try {
      localStorage.setItem("sidebar.collapsed", collapsed ? "true" : "false");
    } catch {}
  }, [collapsed]);

  const renderPage = () => {
    switch (view) {
      case "dashboard":
        return <Dashboard />;
      case "mapa":
        return <MapaInteractivo />;
      case "alertas":
        return <Alertas />;
      case "imagenes":
        return <Images />;
      case "graficos":
        return <GraficoSensores />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-root">
      <Sidebar
        view={view}
        setView={setView}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        user={user}
      />
      <div className="main-area">
        <Topbar
          view={view}
          onRefresh={handleRefresh}
          lastUpdated={lastUpdated}
          user={user}
          collapseToggle={() => setCollapsed((s) => !s)}
          collapsed={collapsed}
        />
        <main className="content-area">{renderPage()}</main>
      </div>
    </div>
  );
}
