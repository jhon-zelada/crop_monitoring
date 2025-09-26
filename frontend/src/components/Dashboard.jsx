// frontend/src/components/Dashboard.jsx
import React from "react";
import SensorCard from "./SensorCard";
import { fetchLatest, fetchSummary, openLive } from "../lib/api";

export default function Dashboard() {
  // Pon aquí un UUID real o deja vacío para "All devices".
  const [deviceId, setDeviceId] = React.useState(""); // Initially empty for "All devices"
  const [devices, setDevices] = React.useState([]); // To hold the list of devices from the backend
  // const DEFAULT_DEVICE = "11111111-1111-1111-1111-111111111111";
  // const [deviceId, setDeviceId] = React.useState(DEFAULT_DEVICE);

  const [now, setNow] = React.useState(new Date());
  const [metrics, setMetrics] = React.useState([
    { key: "temperature_c", title: "Temperatura", value: null, unit: "°C", min: 5, prom: 18, max: 35 },
    { key: "relative_humidity_pct", title: "Humedad Rel.", value: null, unit: "%", min: 20, prom: 50, max: 90 },
    { key: "solar_radiance_w_m2", title: "Radiación Solar", value: null, unit: "W/m²", min: 0, prom: 600, max: 1200 },
    { key: "wind_speed_m_s", title: "Vel. Viento", value: null, unit: "m/s", min: 0, prom: 3, max: 15 },
    { key: "wind_direction_deg", title: "Dir. Viento", value: null, unit: "°" },
  ]);


  // Fetch the list of devices on component mount
  React.useEffect(() => {
    async function fetchDevices() {
      try {
        const response = await fetch("/api/v1/devices");
        const data = await response.json();
        setDevices(data); // Set devices from the backend
        if (data.length > 0) {
          setDeviceId(data[0].id); // Automatically select the first device
        }
      } catch (err) {
        console.error("Failed to fetch devices:", err);
      }
    }

    fetchDevices();
  }, []);

  // clock
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  // initial load + summary (re-run when deviceId changes)
  const loadData = React.useCallback(async () => {
    if (!deviceId) return; // si subscribe a "all", no hay device single para fetchLatest/fetchSummary
    try {
      const [latest, summary] = await Promise.all([
        fetchLatest(deviceId),
        fetchSummary(deviceId, 24),
      ]);

      setMetrics((prev) =>
        prev.map((m) => {
          const v = latest[m.key];
          const s = summary[m.key] || {};
          return {
            ...m,
            value: typeof v === "number" ? Number(v) : m.value,
          };
        })
      );
    } catch (err) {
      console.error("loadData failed:", err);
    }
  }, [deviceId]);

  React.useEffect(() => { loadData(); }, [loadData]);

  // live updates over WS (reconnects when deviceId changes because dependency array includes deviceId)
  React.useEffect(() => {
    const ws = openLive(deviceId); // openLive omite device_id si deviceId falsy

    ws.onopen = () => console.debug("WS open");
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "measurement") {
          // si no hay deviceId seleccionado, aceptamos todos; si hay, filtramos por device_id
          if (!deviceId || msg.device_id === deviceId) {
            const d = msg.data || {};
            setMetrics((prev) =>
              prev.map((m) => {
                const nv = d[m.key];
                return typeof nv === "number" ? { ...m, value: Number(nv) } : m;
              })
            );
          }
        }
      } catch (e) {
        console.warn("WS parse error:", e);
      }
    };
    ws.onerror = (e) => console.warn("WS error", e);
    ws.onclose = (e) => console.debug("WS closed", e);

    return () => {
      try { ws.close(); } catch (e) {}
    };
  }, [deviceId]);

  const formatLocal = (dt) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(dt);

  return (
    <div>
      <div className="banner">
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Proyecto quinua</div>
          <div className="kv">Agricultura de Precisión — Monitoreo IoT</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#065f46" }}>1</div>
          <div className="kv">Parcela</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid var(--card-border)" }}
        >
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>

        <div style={{ marginLeft: "auto", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
          <span>Fecha local:</span>
          <strong>{formatLocal(now)}</strong>
        </div>
      </div>

      <div className="cards-grid">
        {metrics.map((m, i) => (
          <SensorCard key={i} {...m} />
        ))}
      </div>
    </div>
  );
}
