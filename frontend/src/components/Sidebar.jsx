import React from "react";
import logoImg from "../assets/logo.png"; // create frontend/src/assets/logo.png

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "mapa", label: "Mapa Interactivo" },
  { key: "alertas", label: "Alertas" },
  { key: "graficos", label: "Gráfico de Sensores" },
  { key: "imagenes", label: "Visor de Imágenes" },
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
            <img src={logoImg} alt="logo" className="logo-img" height= "30px" />
          ) : (
            <div className="logo-fallback">{user?.initials ?? "CN"}</div>
          )}
        </div>

        {/* title / subtitle shown only when expanded */}
        <div className="brand-text">
          <div className="title">Proyecto Quinua</div>
          <div className="subtitle">Agricultura de Precisión</div>
        </div>

        {/* collapse button */}
        <button
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav>
        <ul style={{ margin: 0, padding: 0 }}>
          {NAV_ITEMS.map((it) => {
            const active = it.key === view;
            return (
              <li
                key={it.key}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => setView(it.key)}
                title={collapsed ? it.label : undefined} // tooltip when collapsed
              >
                <div className="icon"><Icon name={it.key === "alertas" ? "alertas" : it.key === "mapa" ? "mapa" : it.key === "graficos" ? "graficos" : it.key === "imagenes" ? "imagenes" : "dashboard"} /></div>
                <div className="label">{it.label}</div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="status">
        <div style={{ marginBottom: 6 }}>
          <strong style={{ color: "#e6eef4" }}>Conectado como:</strong>
        </div>
        <div style={{ fontWeight: 700 }}>{user?.name ?? "Operador"}</div>
        <div style={{ marginTop: 10 }}>
          <div className="kv">Sistema</div>
          <div style={{ marginTop: 6 }}>
            <span className="badge">Sistema Activo</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

