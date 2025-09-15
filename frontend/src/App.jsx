// src/App.jsx
import React from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import MapaInteractivo from "./pages/MapaInteractivo";
import Alertas from "./pages/Alertas";
import Images from "./pages/Images";
import GraficoSensores from "./pages/GraficoSensores";
import LoginPage from "./pages/Login";

/**
 * Minimal JWT helpers (you can move these to src/lib/auth.js and import them instead)
 */
function parseJwt(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch (e) {
    return null;
  }
}
function isTokenExpired(token) {
  const p = parseJwt(token);
  if (!p) return true;
  const exp = typeof p.exp === "number" ? p.exp : parseInt(p.exp, 10);
  if (!exp || isNaN(exp)) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= exp;
}

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

  // auth state
  const [authenticated, setAuthenticated] = React.useState(false);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [user, setUser] = React.useState(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  // --------- Auth helpers ---------
  const setSessionFromPayload = (payload) => {
    // payload: { access_token, user }
    const token = payload?.access_token || payload?.token;
    if (token) {
      try {
        localStorage.setItem("access_token", token);
      } catch {}
    }
    if (payload?.user) {
      try {
        localStorage.setItem("user", JSON.stringify(payload.user));
        setUser(payload.user);
      } catch {}
    } else if (token) {
      // set minimal user object from token `sub`
      const sub = parseJwt(token)?.sub;
      if (sub) {
        const u = { name: sub };
        try {
          localStorage.setItem("user", JSON.stringify(u));
        } catch {}
        setUser(u);
      }
    }
    setAuthenticated(true);
  };

  const clearSession = () => {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    } catch {}
    setUser(null);
    setAuthenticated(false);
  };

  // call at login (LoginPage should call onLogin(payload))
  const handleLogin = (payload) => {
    setSessionFromPayload(payload);
  };

  // logout: ask server to revoke refresh cookie, then clear local session
  const handleLogout = async () => {
    try {
      // call backend to remove refresh cookie and revoke server-side refresh token
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (e) {
      // ignore network errors but still clear client
      console.warn("logout request failed", e);
    } finally {
      clearSession();
      // optionally navigate to login view
      setView("dashboard");
    }
  };

  // attempt to restore session on app start:
  React.useEffect(() => {
    let mounted = true;
    (async function restore() {
      setAuthLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        if (token && !isTokenExpired(token)) {
          // token is valid locally
          const localUser = JSON.parse(localStorage.getItem("user") || "null");
          if (mounted) {
            setUser(localUser || (parseJwt(token)?.sub ? { name: parseJwt(token).sub } : null));
            setAuthenticated(true);
            setAuthLoading(false);
          }
          return;
        }

        // token missing or expired -> try refresh with httpOnly cookie
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include", // send refresh cookie
          headers: { "Content-Type": "application/json" },
        });

        if (!mounted) return;
        if (res.ok) {
          const payload = await res.json(); // expects { access_token, token_type }
          if (payload?.access_token) {
            // persist and set session
            setSessionFromPayload(payload);
            setAuthLoading(false);
            return;
          }
        }

        // refresh failed -> ensure we are logged out
        clearSession();
      } catch (err) {
        console.error("restore session failed:", err);
        clearSession();
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // persist sidebar collapsed state
  React.useEffect(() => {
    try {
      localStorage.setItem("sidebar.collapsed", collapsed ? "true" : "false");
    } catch {}
  }, [collapsed]);

  // refresh handler (could call backend here)
  const handleRefresh = async () => {
    setLastUpdated(new Date());
    // optionally call APIs to refresh visible data
  };

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

  // show loading screen while restoring session
  if (authLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>Loading…</div>
      </div>
    );
  }

  // If the user is not authenticated, show the login page
  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Authenticated UI
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


