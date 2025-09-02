// src/components/Topbar.jsx
import React from "react";

const VIEW_LABELS = {
  dashboard: "Dashboard Principal",
  mapa: "Mapa Interactivo",
  alertas: "Alertas",
  graficos: "Gráfico de Sensores",
  imagenes: "Visor de Imágenes",
};

export default function Topbar({
  view,
  onRefresh,
  lastUpdated,
  user = {},
  collapseToggle,
  collapsed,
  onLogout,
  onNavigate,
  onProfile,
  onSettings,
  onManageUsers,
}) {
  const title = VIEW_LABELS[view] ?? "Crop Monitor";
  const formatted = lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Nunca";

  // menu state & click/outside handling
  const [menuOpen, setMenuOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const displayName = user?.name ?? user?.fullName ?? "Usuario";
  const email = user?.email ?? "usuario@ejemplo.com";
  const accountType = user?.accountType ?? user?.type ?? "Usuario estándar";

  function getInitialsFromName(name) {
  if (!name || typeof name !== "string") return "U";
  const parts = name.trim().split(/\s+/);
  const initials = parts.map(p => p[0] || "").slice(0,2).join("").toUpperCase();
  return initials || "U";
  }

  const initials = user?.initials ?? getInitialsFromName(displayName);


  const navigate = (target) => {
    setMenuOpen(false);
    if (target === "profile" && typeof onProfile === "function") return onProfile();
    if (target === "settings" && typeof onSettings === "function") return onSettings();
    if (target === "manage" && typeof onManageUsers === "function") return onManageUsers();
    if (typeof onNavigate === "function") return onNavigate(target);
  };

  return (
    <header className="topbar" style={{ position: "relative", zIndex: 40 }}>
      <div className="left">
        <button
          type="button"
          onClick={collapseToggle}
          aria-label="Toggle sidebar"
          title={collapsed ? "Expandir menú" : "Contraer menú"}
          style={{ marginRight: 12, border: "none", background: "transparent", cursor: "pointer" }}
        >
          {collapsed ? "☰" : "≡"}
        </button>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 12, height: 12, borderRadius: 12, background: "#10b981" }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        </div>
      </div>

      <div className="right" style={{ alignItems: "center", display: "flex", gap: 12 }}>
        <div style={{ fontSize: 13, color: "#374151" }}> <Icondate/> Última actualización: {formatted}</div>

        <button
          type="button"
          onClick={onRefresh}
          style={{ padding: "8px 12px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}
        >
          Actualizar
        </button>

        {/* USER MENU */}
        <div ref={containerRef} style={{ position: "relative" }}>
          <button
            type="button"
            className="user-btn"
            onClick={(e) => {
              e.stopPropagation();                 // prevent parent handlers from interfering
              console.debug("Topbar: user button clicked");
              setMenuOpen(v => !v);
            }}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "6px 8px",
              borderRadius: 8,
              zIndex: 45,                          // ensure it sits above siblings
              pointerEvents: "auto",
            }}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={`${displayName} avatar`}
                style={{ width: 36, height: 36, borderRadius: 18, objectFit: "cover" }}
                onError={(ev) => { ev.currentTarget.style.display = "none"; }}
              />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 18, background: "#06b6d4", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700 }}>
                {initials}
              </div>
            )}

          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="Menú de usuario"
              className="user-menu"
              style={{
                position: "absolute",
                right: 0,
                marginTop: 8,
                width: 280,
                background: "var(--panel-bg)",
                border: "1px solid var(--card-border)",
                boxShadow: "0 10px 30px rgba(12,24,44,0.12)",
                borderRadius: 10,
                padding: 8,
                zIndex: 1000,
                pointerEvents: "auto",
              }}
            >
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--card-border)" }}>
                <div style={{ fontWeight: 800 }}>{displayName}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{email}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{accountType}</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 6px" }}>
                <button className="menu-item" onClick={() => navigate("profile")} role="menuitem" style={menuItemStyle}><IconUser/> Perfil</button>
                <button className="menu-item" onClick={() => navigate("settings")} role="menuitem" style={menuItemStyle}><IconSettings/> Configuración</button>
                <button className="menu-item" onClick={() => navigate("manage")} role="menuitem" style={menuItemStyle}><IconUsers/> Gestión de usuarios</button>

                <div style={{ height: 1, background: "var(--card-border)", margin: "6px 0", borderRadius: 2 }} />

                <button
                  className="menu-item logout"
                  onClick={() => { setMenuOpen(false); if (typeof onLogout === "function") onLogout(); }}
                  role="menuitem"
                  style={{ ...menuItemStyle, color: "var(--danger)", background: "rgba(239,68,68,0.04)" }}
                >
                  <IconLogout/> Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* Inline icon components (small, semantic) */
function IconUser() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user mr-2 h-4 w-4">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}
function IconSettings() {
  return (
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings mr-2 h-4 w-4">
  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
  <circle cx="12" cy="12" r="3"></circle>
</svg>
  );
}
function IconUsers() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield mr-2 h-4 w-4">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 10 }}>
      <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Icondate() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-calendar w-4 h-4 relative top-[2px]"
    >
      <path d="M8 2v4"></path>
      <path d="M16 2v4"></path>
      <rect width="18" height="18" x="3" y="4" rx="2"></rect>
      <path d="M3 10h18"></path>
    </svg>
  );
}

    
/* shared menu item style used inline */
const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  background: "transparent",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  textAlign: "left",
  fontSize: 14,
};
