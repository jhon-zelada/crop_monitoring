import React from "react";

const VIEW_LABELS = {
  dashboard: "Dashboard Principal",
  mapa: "Mapa Interactivo",
  alertas: "Alertas",
  graficos: "Gráfico de Sensores",
  imagenes: "Visor de Imágenes",
};

export default function Topbar({ view, onRefresh, lastUpdated, user, collapseToggle, collapsed }) {
  const title = VIEW_LABELS[view] ?? "Crop Monitor";

  const formatted = lastUpdated ? new Date(lastUpdated).toLocaleString() : "Nunca";

  return (
    <header className="topbar">
      <div className="left">
        {/* collapse toggle for convenience on small screens */}
        <button onClick={collapseToggle} aria-label="Toggle sidebar" title={collapsed ? "Expandir menú" : "Contraer menú"} style={{ marginRight: 12, border: "none", background: "transparent", cursor: "pointer" }}>
          {collapsed ? "☰" : "≡"}
        </button>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 12, height: 12, borderRadius: 12, background: "#10b981" }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        </div>
      </div>

      <div className="right">
        <div style={{ fontSize: 13, color: "#374151" }}>Última actualización: {formatted}</div>
        <button onClick={onRefresh} style={{ padding: "8px 12px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}>
          Actualizar
        </button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {user?.avatar ? (
            <img src={user.avatar} alt="avatar" style={{ width: 36, height: 36, borderRadius: 18 }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 18, background: "#06b6d4", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700 }}>
              {user?.initials ?? "U"}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
