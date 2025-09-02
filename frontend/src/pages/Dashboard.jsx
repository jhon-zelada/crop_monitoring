import React from "react";
import SensorCard from "../components/SensorCard";
import { fetchLatest, fetchSummary, openLive } from "../lib/api";

export default function Dashboard() {
  const [deviceId, setDeviceId] = React.useState("device-1"); // pick your real device id
  const [now, setNow] = React.useState(new Date());
  const [metrics, setMetrics] = React.useState([
    { key: "temperature_c",    title: "Temperatura",   value: null, unit: "°C",  min: null, max: null, prom: null },
    { key: "relative_humidity_pct", title: "Humedad Rel.", value: null, unit: "%",  min: null, max: null, prom: null },
    { key: "solar_radiance_w_m2",   title: "Radiación Solar", value: null, unit: "W/m²", min: null, max: null, prom: null },
    { key: "wind_speed_m_s",   title: "Vel. Viento",   value: null, unit: "m/s", min: null, max: null, prom: null },
    { key: "wind_direction_deg", title: "Dir. Viento", value: null, unit: "°" },
  ]);

  // clock
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  // initial load + summary
  const loadData = React.useCallback(async () => {
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
            min:  typeof s.min === "number" ? Number(s.min) : m.min,
            max:  typeof s.max === "number" ? Number(s.max) : m.max,
            prom: typeof s.avg === "number" ? Number(s.avg) : m.prom,
          };
        })
      );
    } catch (err) {
      console.error("loadData failed:", err);
    }
  }, [deviceId]);

  React.useEffect(() => { loadData(); }, [loadData]);

  // live updates over WS
  React.useEffect(() => {
    const ws = openLive(deviceId);

    ws.onopen = () => console.debug("WS open");
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "measurement" && msg.device_id === deviceId) {
          const d = msg.data || {};
          setMetrics((prev) =>
            prev.map((m) => {
              const nv = d[m.key];
              return typeof nv === "number" ? { ...m, value: Number(nv) } : m;
            })
          );
        }
      } catch (e) {
        console.warn("WS parse error:", e);
      }
    };
    ws.onerror = (e) => console.warn("WS error", e);
    ws.onclose = () => console.debug("WS closed");

    return () => ws.close();
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
          <option value="device-1">Parcela 1 - Quinua</option>
          {/* Add your real devices here */}
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
