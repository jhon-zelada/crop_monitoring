// File: src/components/Sidebar.jsx (updated — adds spacing and aligned section titles)
import React from "react";
import logoImg from "../assets/logo.png"; // create frontend/src/assets/logo.png

// main / admin nav groups
const MAIN_NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "mapa", label: "Mapa Interactivo" },
  { key: "alertas", label: "Alertas" },
  { key: "graficos", label: "Gráfico de Sensores" },
  { key: "imagenes", label: "Visor de Imágenes" },
];

const ADMIN_NAV_ITEMS = [
  { key: "usuarios", label: "Usuarios" },
  { key: "parcelas", label: "Parcelas" },
  { key: "permisos", label: "Permisos" },
];

// small inline icons (simple)
function Icon({ name }) {
  const style = { width: 18, height: 18, display: "inline-block" };
  switch (name) {
    case "dashboard":
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      );
    case "mapa":
      return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21 1 6"/></svg>;
    case "alertas":
      return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
    case "graficos":
      return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
    case "imagenes":
      return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>;

    // admin icons
    case "usuarios":
      return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case "parcelas":
      return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z"/></svg>;
    case "permisos":
      return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;

    default:
      return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg>;
  }
}

export default function Sidebar({ view, setView, collapsed, setCollapsed, user }) {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`} role="navigation" aria-label="Sidebar">
      <div className="brand">
        <div className="logo-wrap">
          {logoImg ? (
            <img src={logoImg} alt="logo" className="logo-img" height="30" />
          ) : (
            <div className="logo-fallback">{user?.initials ?? "CN"}</div>
          )}
        </div>

        {/* title / subtitle shown only when expanded */}
        <div className="brand-text">
          <div className="title">Proyecto Quinua</div>
          <div className="subtitle">Agricultura de Precisión</div>
        </div>
      </div>

      <nav>
        <ul style={{ margin: 0, padding: 0 }}>
          {/* Principal section title (aligned with icons) */}
          {!collapsed && (
            <li
              className="nav-section-title"
              key="sec-principal"
              aria-hidden
              style={{ display: "flex", alignItems: "center", padding: "12px 8px 4px 8px", fontSize: "0.75rem", fontWeight: 600, color: "#8899a6" }}
            >
              
              PRINCIPAL
            </li>
          )}

          {MAIN_NAV_ITEMS.map((it) => {
            const active = it.key === view;
            return (
              <li
                key={it.key}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => setView(it.key)}
                title={collapsed ? it.label : undefined} // tooltip when collapsed
                style={{ marginTop: 4 }}
              >
                <div className="icon"><Icon name={it.key} /></div>
                <div className="label">{it.label}</div>
              </li>
            );
          })}

          {/* Administración section title (aligned with icons) */}
          {!collapsed && (
            <li
              className="nav-section-title"
              key="sec-admin"
              aria-hidden
              style={{ display: "flex", alignItems: "center", padding: "16px 8px 4px 8px", fontSize: "0.75rem", fontWeight: 600, color: "#8899a6" }}
            >
              
              ADMINISTRACIÓN
            </li>
          )}

          {ADMIN_NAV_ITEMS.map((it) => {
            const active = it.key === view;
            return (
              <li
                key={it.key}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => setView(it.key)}
                title={collapsed ? it.label : undefined}
                style={{ marginTop: 4 }}
              >
                <div className="icon"><Icon name={it.key} /></div>
                <div className="label">{it.label}</div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="status">
        <div style={{ marginBottom: 6 }}>
          <strong style={{ color: "#4b5563ff" }}>Conectado como:</strong>
        </div>
        <div style={{ fontWeight: 700 }}>{user?.name ?? "Operador"}</div>
        <div style={{ marginTop: 10 }}>
          
          <div style={{ marginTop: 6 }}>
            <span className="badge"> Sistema activo</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

