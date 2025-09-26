// frontend/src/components/Alertas.jsx
import React from "react";
import { fetchLatest, openLive } from "../lib/api";
import { computeStatus } from "./SensorCard";

export default function Alertas() {
  const [alerts, setAlerts] = React.useState([]);
  const [deviceId, setDeviceId] = React.useState("");
  const [devices, setDevices] = React.useState([]);

  // Fetch devices
  React.useEffect(() => {
    async function loadDevices() {
      try {
        const res = await fetch("/api/v1/devices");
        const data = await res.json();
        setDevices(data);
        if (data.length > 0) setDeviceId(data[0].id);
      } catch (e) {
        console.error("Error loading devices", e);
      }
    }
    loadDevices();
  }, []);

  // Initial load: check latest metrics -> alerts
  React.useEffect(() => {
    async function loadLatest() {
      if (!deviceId) return;
      try {
        const latest = await fetchLatest(deviceId);
        processMetrics(latest, deviceId);
      } catch (e) {
        console.error("Error loading latest metrics", e);
      }
    }
    loadLatest();
  }, [deviceId]);

  // Live updates via WS
  React.useEffect(() => {
    if (!deviceId) return;
    const ws = openLive(deviceId);

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "measurement" && msg.device_id === deviceId) {
          processMetrics(msg.data, msg.device_id);
        }
      } catch (e) {
        console.warn("WS parse error", e);
      }
    };

    return () => {
      try {
        ws.close();
      } catch (e) {}
    };
  }, [deviceId]);

  function formatReadable(t) {
    const dt = t ? new Date(t) : new Date();
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    const hh = String(dt.getHours()).padStart(2, "0");
    const min = String(dt.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }
  // Helper to compute alerts from metrics
  const processMetrics = (metrics, deviceId) => {
    if (!metrics) return;
    const now = new Date();
    const t = metrics.time || metrics.timestamp || metrics.ts || metrics.created_at || metrics.date;
    const device = devices.find((d) => d.id === deviceId);
    const deviceName = device ? device.name : "Dispositivo";

    const newAlerts = Object.entries(metrics)
      .map(([key, value]) => {
        const mapping = {
          temperature_c: "Temperatura",
          relative_humidity_pct: "Humedad Rel.",
          solar_radiance_w_m2: "Radiación Solar",
          wind_speed_m_s: "Vel. Viento",
          wind_direction_deg: "Dir. Viento",
        };
        const title = mapping[key];
        if (!title) return null;

        const status = computeStatus(title, value);
        if (status.level === "good") return null;

        return {
          id: `${key}-${now.getTime()}`,
          type: `${title} ${status.level === "bad" ? "crítica" : "advertencia"}`,
          severity: status.level === "bad" ? "Alta" : "Media",
          message: `${title} = ${value} en ${deviceName}`,
          time: formatReadable(t ? new Date(t).toISOString() : new Date().toISOString()),
          ack: false,
        };
      })
      .filter(Boolean);

    if (newAlerts.length > 0) {
      setAlerts((prev) => {
        const acked = prev.filter((a) => a.ack);
        return [...acked, ...newAlerts];
      });
    }
  };

  const acknowledge = (id) => {
    setAlerts((s) => s.map((a) => (a.id === id ? { ...a, ack: true } : a)));
  };

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Alertas</h2>

      <div className="alert-list">
        {alerts.length === 0 && (
          <div style={{ color: "#64748b", fontStyle: "italic" }}>
            Sin alertas activas
          </div>
        )}

        {alerts.map((a) => (
          <div key={a.id} className="alert-item">
            <div>
              <div style={{ fontWeight: 700 }}>
                {a.type}
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  · {a.time}
                </span>
              </div>
              <div style={{ marginTop: 6 }}>{a.message}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  alignSelf: "center",
                  background: a.severity === "Alta" ? "#fee2e2" : "#fff7ed",
                  padding: "6px 10px",
                  borderRadius: 8,
                }}
              >
                {a.severity}
              </div>
              <button
                onClick={() => acknowledge(a.id)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: a.ack ? "#94a3b8" : "#06b6d4",
                  color: "#fff",
                  border: "none",
                }}
              >
                {a.ack ? "Reconocida" : "Reconocer"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
