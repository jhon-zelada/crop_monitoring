// File: src/App.jsx (updated — adds public landing page, consistent token handling)
import React from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./components/Dashboard";
import MapaInteractivo from "./pages/MapaInteractivo";
import Alertas from "./components/Alertas";
import Images from "./components/Images";
import GraficoSensores from "./components/GraficoSensores";
import UsersPage from "./components/UsersPage";
import LoginPage from "./pages/Login";
import LandingPage from "./pages/Landing";

export default function App() {
  // main app view
  const [view, setView] = React.useState("dashboard");

  // public view when unauthenticated: 'landing' | 'login'
  const [publicView, setPublicView] = React.useState("landing");

  // sidebar collapsed persisted
  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem("sidebar.collapsed") === "true";
    } catch {
      return false;
    }
  });

  // dynamic timestamp
  const [lastUpdated, setLastUpdated] = React.useState(null);

  // token-based gating (keeps using 'access_token')
  const [authenticated, setAuthenticated] = React.useState(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  // user (default); you can replace with server-provided payload.user on login
  const [user, setUser] = React.useState({
    name: "Carlos Mendoza",
    avatar: null,
    email: "carlos.mendoza@example.com",
    accountType: "Administrador",
  });

  // callback after successful login (LoginPage calls onLogin(payload))
  const handleLogin = (payload) => {
    // Save token if backend didn't already (LoginPage already stores it but this is defensive)
    try {
      const token = payload?.access_token || payload?.token || null;
      if (token) localStorage.setItem("access_token", token);
    } catch {}

    // store user if available
    if (payload?.user) {
      setUser(payload.user);
      try { localStorage.setItem('user', JSON.stringify(payload.user)); } catch {}
    }

    setAuthenticated(true);
    // ensure UI starts at dashboard after login
    setView("dashboard");
  };

  const handleLogout = () => {
    // keep key name consistent: remove access_token (and optionally user)
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    } catch {}
    setAuthenticated(false);
    // show landing after logout
    setPublicView("landing");
  };

  // refresh handler
  const handleRefresh = async () => {
    setLastUpdated(new Date());
    // place for real API refresh calls
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
      case "usuarios":
        return <UsersPage />;
        //return <div>Gestión de Usuarios (próximamente)</div>;
      case "parcelas":
        return <div>Gestión de Parcelas (próximamente)</div>;
      case "permisos":
        return <div>Gestión de Permisos (próximamente)</div>;
      default:
        return <Dashboard />;
    }
  };

  // --- public flow: landing or login ---
  if (!authenticated) {
    // If publicView === "login" show the login form immediately.
    // Provide onBack so the Login page can return to landing.
    if (publicView === "login") {
      return (
        <LoginPage
          onLogin={handleLogin}
          openForm={true}
          onBack={() => setPublicView("landing")}
        />
      );
    }
    // otherwise show landing
    return <LandingPage onLoginClick={() => setPublicView("login")} />;
  }


  // --- authenticated app ---
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



