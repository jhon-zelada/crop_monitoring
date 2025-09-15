// frontend/src/lib/api.js
import { authFetch } from "./auth";

const BASE = import.meta.env.VITE_BACKEND_URL || ""; // e.g. "http://localhost:8000" or ""

// Fetch latest measurement for a device (protected)
export async function fetchLatest(deviceId) {
  const r = await authFetch(`${BASE}/api/v1/devices/${deviceId}/latest`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!r.ok) throw new Error(`latest failed: ${r.status}`);
  return r.json();
}

// Fetch summary (protected)
export async function fetchSummary(deviceId, hours = 24) {
  const r = await authFetch(`${BASE}/api/v1/devices/${deviceId}/summary?hours=${hours}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!r.ok) throw new Error(`summary failed: ${r.status}`);
  return r.json();
}

/**
 * openLive(deviceId)
 * - uses access_token stored in localStorage and sends it as ?access_token=...
 */
export function openLive(deviceId) {
  const token = localStorage.getItem("access_token") || "";
  const params = new URLSearchParams();
  if (deviceId) params.set("device_id", deviceId);
  if (token) params.set("access_token", token);

  const proto = location.protocol === "https:" ? "wss" : "ws";
  const defaultWs = `${proto}://${location.hostname}:8000`; // fallback: backend en :8000
  const rawWsBase = import.meta.env.VITE_WS_URL || defaultWs; // can be "http://..." or "ws://..."
  const wsBase = rawWsBase.startsWith("ws") ? rawWsBase : rawWsBase.replace(/^http/, "ws");

  const wsUrl = `${wsBase.replace(/\/$/, "")}/ws/live?${params.toString()}`;
  return new WebSocket(wsUrl);
}
