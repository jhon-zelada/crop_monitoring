// frontend/src/lib/api.js
const BASE = import.meta.env.VITE_BACKEND_URL || ""; // e.g. "http://localhost:8000" or ""
// RECOMENDACIÓN: en desarrollo define VITE_WS_URL="http://localhost:8000" o "ws://localhost:8000"

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchLatest(deviceId) {
  const r = await fetch(`${BASE}/api/v1/devices/${deviceId}/latest`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (!r.ok) throw new Error(`latest failed: ${r.status}`);
  return r.json();
}

export async function fetchSummary(deviceId, hours = 24) {
  const r = await fetch(`${BASE}/api/v1/devices/${deviceId}/summary?hours=${hours}`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (!r.ok) throw new Error(`summary failed: ${r.status}`);
  return r.json();
}

/**
 * openLive(deviceId)
 * - deviceId: UUID string or falsy (''/null) to subscribe to ALL devices
 * - reads token from localStorage 'token' and sends it as ?access_token=...
 * - uses VITE_WS_URL if provided; otherwise assumes backend at same host on port 8000
 */
export function openLive(deviceId) {
  const token = localStorage.getItem("access_token") || ""; // asegúrate de guardar token para pruebas (ej: 'supersecrettoken123')
  const params = new URLSearchParams();
  if (deviceId) params.set("device_id", deviceId);
  if (token) params.set("access_token", token); // <- importante: backend espera access_token

  const proto = location.protocol === "https:" ? "wss" : "ws";
  const defaultWs = `${proto}://${location.hostname}:8000`; // fallback: backend en :8000
  const rawWsBase = import.meta.env.VITE_WS_URL || defaultWs; // puede ser "http://..." o "ws://..." o "https://..."
  // si user puso http(s), convertir a ws(s)
  const wsBase = rawWsBase.startsWith("ws") ? rawWsBase : rawWsBase.replace(/^http/, "ws");

  const wsUrl = `${wsBase.replace(/\/$/, "")}/ws/live?${params.toString()}`;
  return new WebSocket(wsUrl);
}
