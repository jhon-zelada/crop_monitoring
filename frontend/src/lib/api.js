const BASE = import.meta.env.VITE_BACKEND_URL || ""; // with proxy it's ""

function authHeaders() {
  const token = localStorage.getItem("token");
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

export function openLive(deviceId) {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const WS_BASE = import.meta.env.VITE_WS_URL || `${proto}://${location.host}`;
  // proxy maps /ws → backend:8000
  return new WebSocket(`${WS_BASE}/ws/live?device_id=${encodeURIComponent(deviceId)}`);
}
