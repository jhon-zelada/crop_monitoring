import React, { useEffect, useRef, useState } from "react";

/**
 * UsersPage.jsx
 * Single-file React component that provides:
 * - Metrics (total, active, admins, operators, viewers)
 * - Search + filters
 * - Paginated users table
 * - "New user" modal with validation + create flow
 * - CSV export and mock API fallback (so you can drop it in and test)
 *
 * Integration notes (readme within file):
 * - The component expects these backend endpoints (replace API_BASE):
 *   GET  /api/users?query=&role=&status=&page=&perPage=    => { users:[], total }
 *   GET  /api/users/counts                                  => { total, active, admins, operators, viewers }
 *   POST /api/users                                         => creates user, returns created user
 *   PATCH/DELETE /api/users/:id                              => edit / disable user
 *
 * - If the backend is not available it will use localStorage-backed mock data for quick testing.
 * - Styling uses Tailwind-like utility classes to match the app HTML you provided. If you don't use
 *   Tailwind, the class names are easy to adapt to your CSS variables (or keep the global CSS you gave).
 */



const API_BASE = import.meta.env.VITE_API_BASE || "";

const DEFAULT_ROLES = ["Administrador", "Operador", "Visualizador"];
const DEFAULT_STATUSES = ["activo", "inactivo"];

/* -----------------------------
   Small helper components
   ----------------------------- */
function MetricCard({ title, value, icon, colorClass = "text-gray-800" }) {
  return (
    <div className="metric-card">
      <div className="metric-head">
        <div className="flex items-center gap-2">
          {icon && <span className="metric-icon" aria-hidden="true">{icon}</span>} {title}
        </div>
      </div>

      <div className={`metric-value ${colorClass}`}>{value}</div>
    </div>
  );
}





function Badge({ children, variant = "default" }) {
  const base = "inline-block px-2 py-0.5 rounded-full text-xs font-semibold";
  const map = {
    activo: "bg-green-50 text-green-600",
    inactivo: "bg-gray-100 text-gray-700",
    Administrador: "bg-red-50 text-red-600",
    Operador: "bg-blue-50 text-blue-600",
    Visualizador: "bg-green-50 text-green-600",
    default: "bg-gray-100 text-gray-700",
  };
  return <span className={`${base} ${map[variant] || map.default}`}>{children}</span>;
}

/* -----------------------------
   New User Modal
   ----------------------------- */
function NewUserModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(DEFAULT_ROLES[2]);
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const firstInput = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => firstInput.current && firstInput.current.focus(), 50);
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    // client-side validation
    if (!name.trim()) return setError("El nombre es requerido.");
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) return setError("Email inválido.");
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (password !== confirmPassword) return setError("Las contraseñas no coinciden.");

    setSending(true);
    try {
      const payload = { name: name.trim(), email: email.toLowerCase(), role, department, password };
      // delegate actual creation to parent (so it can call API)
      await onCreate(payload);
      // reset
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setDepartment("");
      onClose();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Error creando usuario.");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-xl bg-white rounded-lg p-6 shadow-lg"
        aria-modal="true"
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Nuevo Usuario</h3>
          <button type="button" className="text-muted" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <input ref={firstInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" className="input" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" className="input" />
          <div className="grid grid-cols-2 gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
              {DEFAULT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Departamento" className="input" />
          </div>

          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" className="input" />
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar contraseña" className="input" />
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={sending}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? "Creando..." : "Crear Usuario"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* -----------------------------
   Main page component
   ----------------------------- */
export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, admins: 0, operators: 0, viewers: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [showNewModal, setShowNewModal] = useState(false);
  const [toast, setToast] = useState(null);

  const searchDebounceRef = useRef(null);

  useEffect(() => {
    loadCounts();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // debounce search & filters
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => loadUsers(1), 300);
    return () => clearTimeout(searchDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function loadCounts() {
    try {
      const res = await fetch(`${API_BASE}/api/users/counts`);
      if (!res.ok) throw new Error("no backend");
      const json = await res.json();
      setCounts(json);
    } catch (err) {
      // fallback: compute from mock/localStorage
      const cached = getMockUsers();
      const computed = computeCountsFromList(cached);
      setCounts(computed);
    }
  }

  async function loadUsers(requestedPage = 1) {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ query: query || "", role: roleFilter || "", status: statusFilter || "", page: String(requestedPage), perPage: String(perPage) });
      const res = await fetch(`${API_BASE}/api/users?${qs.toString()}`);
      if (!res.ok) throw new Error("no backend");
      const json = await res.json();
      setUsers(json.users || []);
      setTotal(json.total || 0);
    } catch (err) {
      // fallback to local mock
      const all = getMockUsers();
      const filtered = all.filter((u) => {
        if (query && !(`${u.name} ${u.email} ${u.department}`.toLowerCase().includes(query.toLowerCase()))) return false;
        if (roleFilter && u.role !== roleFilter) return false;
        if (statusFilter && u.status !== statusFilter) return false;
        return true;
      });
      const start = (requestedPage - 1) * perPage;
      setUsers(filtered.slice(start, start + perPage));
      setTotal(filtered.length);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(payload) {
    // payload: { name, email, role, department, password }
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // try to surface backend error
        const txt = await res.text();
        throw new Error(txt || "Error creating");
      }
      const created = await res.json();
      // optimistic UI update
      setUsers((s) => [created, ...s]);
      setTotal((t) => t + 1);
      setToast({ type: "success", text: "Usuario creado" });
      // re-fetch counts
      loadCounts();
    } catch (err) {
      console.warn("API create user failed, saving to mock storage", err);
      // fallback: persist to mock
      const newUser = createMockUser(payload);
      setUsers((s) => [newUser, ...s]);
      setTotal((t) => t + 1);
      setToast({ type: "success", text: "Usuario creado (mock)" });
      loadCounts();
    }
  }

  function computeCountsFromList(list) {
    const total = list.length;
    const active = list.filter((u) => u.status === "activo").length;
    const admins = list.filter((u) => u.role === "Administrador").length || 0;
    const operators = list.filter((u) => u.role === "Operador").length || 0;
    const viewers = list.filter((u) => u.role === "Visualizador").length || 0;
    return { total, active, admins, operators, viewers };
  }

  /* -----------------------------
     Utilities: mock data (used when backend is absent)
     ----------------------------- */
  function getMockUsers() {
    const raw = localStorage.getItem("_mock_users_v1");
    if (raw) return JSON.parse(raw);
    const sample = Array.from({ length: 17 }).map((_, i) => {
      const roles = DEFAULT_ROLES;
      const r = roles[i % roles.length];
      return {
        id: `u-${i + 1}`,
        name: [`María`, `Carlos`, `Ana`, `Luis`, `Jose`][i % 5] + ` ${i + 1}`,
        email: `user${i + 1}@example.com`,
        role: r,
        status: i % 3 === 0 ? "inactivo" : "activo",
        department: ["Campo", "Oficina", "TI"][i % 3],
        lastAccess: new Date(Date.now() - i * 1000 * 60 * 60 * 24).toISOString(),
        createdAt: new Date(Date.now() - i * 1000 * 60 * 60 * 24 * 7).toISOString(),
      };
    });
    localStorage.setItem("_mock_users_v1", JSON.stringify(sample));
    return sample;
  }

  function createMockUser({ name, email, role, department }) {
    const all = getMockUsers();
    const id = `u-${Math.floor(Math.random() * 100000)}`;
    const u = { id, name, email, role, status: "activo", department, lastAccess: null, createdAt: new Date().toISOString() };
    all.unshift(u);
    localStorage.setItem("_mock_users_v1", JSON.stringify(all));
    return u;
  }

  /* -----------------------------
     Export CSV
     ----------------------------- */
  function exportCSV() {
    const rows = users.map((u) => ({ ID: u.id, Nombre: u.name, Email: u.email, Rol: u.role, Estado: u.status, Departamento: u.department, ÚltimoAcceso: u.lastAccess || "-" }));
    if (!rows.length) return setToast({ type: "info", text: "No hay usuarios para exportar" });
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usuarios_page_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* -----------------------------
     Render
     ----------------------------- */
  return (
    <div className="main-area p-6">
      {/* Header + controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <p className="text-sm text-muted">Administración de usuarios — registra, filtra y exporta</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn border" onClick={exportCSV} title="Exportar CSV">
            Exportar
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="cards-grid mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Usuarios"
          value={counts.total ?? 0}
          colorClass="text-blue-600"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className="lucide lucide-users w-4 h-4 text-blue-600">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          }
        />

        <MetricCard
          title="Activos"
          value={counts.active ?? 0}
          colorClass="text-green-600"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className="lucide lucide-circle-check-big w-4 h-4 text-green-600">
              <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
              <path d="m9 11 3 3L22 4"></path>
            </svg>
          }
        />

        <MetricCard
          title="Administradores"
          value={counts.admins ?? 0}
          colorClass="text-red-600"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className="lucide lucide-shield w-4 h-4 text-red-600">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
            </svg>
          }
        />

        <MetricCard
          title="Operadores"
          value={counts.operators ?? 0}
          colorClass="text-blue-600"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className="lucide lucide-square-pen w-4 h-4 text-blue-600">
              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
            </svg>
          }
        />
      </div>




      {/* Search + filters */}
      <div className="card mb-4">
        <div className="filters-row">
          <div className="flex-1 relative">
            <input
              aria-label="Buscar usuarios"
              placeholder="Buscar por nombre, email o departamento..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input pl-10"
            />
            <div className="search-icon">🔍</div>
          </div>

          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input">
            <option value="">Todos los roles</option>
            {DEFAULT_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">Todos</option>
            {DEFAULT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>


      {/* Table */}
      <div className="card">
        <div className="overflow-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Contacto</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Último Acceso</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted">
                    Cargando...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted">
                    No se encontraron usuarios con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-3">
                      <div className="font-semibold">{u.name}</div>
                      <div className="text-xs text-muted">{u.department || "-"}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant={u.role}>{u.role}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant={u.status}>{u.status}</Badge>
                    </td>
                    <td className="p-3">{u.lastAccess ? new Date(u.lastAccess).toLocaleString() : "-"}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="btn btn-ghost">Editar</button>
                        <button className="btn btn-danger">Desactivar</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination mt-4">
          <div className="pagination-info">
            Mostrando {users.length} de {total} usuarios
          </div>

          <div className="pagination-controls">
            <button
              className="btn btn-ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </button>

            <div className="page-indicator">{page}</div>

            <button
              className="btn btn-ghost"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * perPage >= total}
            >
              Siguiente
            </button>
          </div>
        </div>

      </div>

      {/* new user modal */}
      <NewUserModal open={showNewModal} onClose={() => setShowNewModal(false)} onCreate={handleCreateUser} />

      {/* toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 p-3 rounded shadow-lg ${toast.type === "success" ? "bg-green-600 text-white" : "bg-gray-800 text-white"}`}>
          {toast.text}
          <button className="ml-3" onClick={() => setToast(null)}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

/* -----------------------------
   Styling helpers (internal small helpers for the demo)
   If your app already has utility classes (Tailwind) you can remove these.
   ----------------------------- */

/*
  NOTE: The demo uses class names like `card`, `input`, `btn`, `btn-primary`.
  If you don't have them in your global CSS, add equivalents or keep your project's utility classes.
*/
