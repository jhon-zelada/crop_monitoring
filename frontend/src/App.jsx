// File: src/App.jsx (drop-in replacement; keeps your existing pages & components, adds auth gating)
import React from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import MapaInteractivo from "./pages/MapaInteractivo";
import Alertas from "./pages/Alertas";
import Images from "./pages/Images";
import GraficoSensores from "./pages/GraficoSensores";
import LoginPage from "./pages/Login";

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

  // auth: simple token-based gating (replace with your real auth flow)
  const [authenticated, setAuthenticated] = React.useState(() => {
    try {
      return !!localStorage.getItem("token");
    } catch {
      return false;
    }
  });

  // example user (avatar or initials)
  const user = {
    name: "Carlos Mendoza",
    avatar: null,
    email: "carlos.mendoza@example.com",
    accountType: "Administrador"
  };

  // login callback from LoginPage
  const handleLogin = (payload) => {
    // payload is whatever your backend returned (user, token...)
    setAuthenticated(true);
    // optional: set user info from payload.user
  };

  const handleLogout = () => {
    try { localStorage.removeItem('token'); } catch {}
    setAuthenticated(false);
  };

  // refresh handler (could call backend here)
  const handleRefresh = async () => {
    // simulate update (replace with real API call)
    setLastUpdated(new Date());
    // e.g. await api.fetchLatest();
  };

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

  // If the user is not authenticated, show the login page
  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

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
          onLogout={handleLogout}
          onNavigate={setView}
        />
        <main className="content-area">{renderPage()}</main>
      </div>
    </div>
  );
}


