import React from "react";
import SensorCard from "../components/SensorCard";

export default function Dashboard() {
  // dummy values
  const metrics = [
    { title: "Temperatura", value: 25.9, unit: "°C", min: 18, max: 32, prom: 24 },
    { title: "Humedad Rel.", value: 58.7, unit: "%", min: 40, max: 90, prom: 62 },
    { title: "Radiación Solar", value: 819.8, unit: "W/m²", min: 100, max: 1200, prom: 700 },
    { title: "Vel. Viento", value: 5.0, unit: "m/s", min: 0, max: 20, prom: 6 },
    { title: "Dir. Viento", value: 154, unit: "°" },
  ];

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
        <select style={{ padding: 10, borderRadius: 8, border: "1px solid var(--card-border)" }}>
          <option>Parcela 1 - Quinua</option>
        </select>
        <div style={{ marginLeft: "auto", color: "#64748b" }}>Fecha local: 01/09/2025, 07:47 p.m.</div>
      </div>
      
      <div className="cards-grid">
        {metrics.map((m, i) => (
          <SensorCard key={i} {...m} />
        ))}

        {/* Example of a large card */}
        {/* <div className="card large" style={{ background: "linear-gradient(90deg,#ecfdf5,#f0fdf4)", border: "1px solid #d1fae5" }}>
          <div>
            <div style={{ fontSize: 14, color: "#065f46", fontWeight: 700 }}>Monitoreo de Parcelas</div>
            <div className="kv">Corredor Económico Abancay-Aymaraes, Región Apurímac</div>
          </div>
          <div>
            <button style={{ padding: "8px 12px", borderRadius: 8, background: "#06b6d4", color: "#fff", border: "none" }}>Exportar</button>
          </div>
        </div> */}
      </div>
    </div>
  );
}
