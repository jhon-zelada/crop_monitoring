import React from "react";

/* very small sparkline generator */
function Sparkline({ data = [], width = 160, height = 40 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const len = data.length;
  const step = width / (len - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / (max - min || 1)) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" stroke="#10b981" strokeWidth="2" points={points} />
    </svg>
  );
}

export default function GraficoSensores() {
  const data = [20, 21, 22.5, 24, 25.2, 23.1, 22, 21.5, 22, 23];

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Gráfico de Sensores</h2>

      <div style={{ display: "flex", gap: 12 }}>
        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontWeight: 700 }}>Temperatura (Últimas 24h)</div>
            <div className="kv">Prom: 23.2 °C</div>
          </div>
          <Sparkline data={data} width={600} height={140} />
        </div>

        <div className="card" style={{ width: 260 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Resumen</div>
          <div className="kv">Max: 25.2 °C</div>
          <div className="kv">Min: 20.0 °C</div>
        </div>
      </div>
    </div>
  );
}
