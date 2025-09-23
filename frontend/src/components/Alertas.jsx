import React from "react";

const initialAlerts = [
  { id: 1, type: "Temperatura alta", severity: "Alta", message: "Temperatura > 40°C en estación weather-01", time: "2025-09-01 14:10", ack: false },
  { id: 2, type: "Humedad baja", severity: "Media", message: "Humedad < 30% - soil-01", time: "2025-09-01 09:20", ack: false },
];

export default function Alertas() {
  const [alerts, setAlerts] = React.useState(initialAlerts);

  const acknowledge = (id) => {
    setAlerts((s) => s.map((a) => (a.id === id ? { ...a, ack: true } : a)));
  };

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Alertas</h2>

      <div className="alert-list">
        {alerts.map((a) => (
          <div key={a.id} className="alert-item">
            <div>
              <div style={{ fontWeight: 700 }}>{a.type} <span style={{ marginLeft: 8, fontSize: 12, color: "#64748b" }}>· {a.time}</span></div>
              <div style={{ marginTop: 6 }}>{a.message}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ alignSelf: "center", background: a.severity === "Alta" ? "#fee2e2" : "#fff7ed", padding: "6px 10px", borderRadius: 8 }}>{a.severity}</div>
              <button onClick={() => acknowledge(a.id)} style={{ padding: "8px 10px", borderRadius: 8, background: a.ack ? "#94a3b8" : "#06b6d4", color:"#fff", border:"none" }}>
                {a.ack ? "Reconocida" : "Reconocer"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
