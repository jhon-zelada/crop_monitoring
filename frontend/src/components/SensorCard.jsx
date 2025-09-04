import React from "react";

/**
 * SensorCard
 * - Computes a status level (good/warn/bad) from the title+value using sensible defaults for quinoa.
 * - Shows colored status dot + text.
 * - Renders compass for "Dir. Viento" (interprets value as degrees, 0 = North).
 *
 * If you prefer to decide status upstream, pass a prop `overrideStatus = { level: 'good'|'warn'|'bad', text: '...' }`
 */

function computeStatus(title, value) {
  // Defaults (heuristics) — tweak freely.
  // Temperature (°C)
  if (title === "Temperatura") {
    // ideal per FAO ~15-20°C; expanded a bit for diurnal swings
    if (value >= 15 && value <= 25) return { level: "good", text: "Normal" };
    if ((value >= 10 && value < 15) || (value > 25 && value <= 30)) return { level: "warn", text: "Advertencia" };
    return { level: "bad", text: "Alerta" };
  }

  // Humedad Relativa (%)
  if (title === "Humedad Rel.") {
    // quinoa grows across broad RH but disease risk increases at very high RH
    if (value >= 40 && value <= 70) return { level: "good", text: "Normal" };
    if ((value >= 30 && value < 40) || (value > 70 && value <= 85)) return { level: "warn", text: "Advertencia" };
    return { level: "bad", text: "Alerta" };
  }

  // Radiación Solar (W/m²) — instantaneous irradiance
  if (title === "Radiación Solar") {
    // typical clear-sky midday ≈ 800–1100 W/m²; photosynthesis limited at very low irradiance
    if (value >= 200 && value <= 1100) return { level: "good", text: "Normal" };
    if ((value >= 100 && value < 200) || (value > 1100 && value <= 1200)) return { level: "warn", text: "Advertencia" };
    return { level: "bad", text: "Alerta" };
  }

  // Velocidad del Viento (m/s)
  if (title === "Vel. Viento") {
    // lodging risk increases with stronger wind; thresholds are heuristic and should be tuned to your cultivar/stage
    if (value < 6) return { level: "good", text: "Normal" };
    if (value >= 6 && value < 10) return { level: "warn", text: "Advertencia" };
    return { level: "bad", text: "Alerta" };
  }

  // Direction (compass) doesn't need status
  if (title === "Dir. Viento") {
    return { level: "good", text: "Dirección" };
  }

  // fallback: neutral
  return { level: "good", text: "Normal" };
}

function Compass({ degrees = 0 }) {
  const deg = ((Number(degrees) % 360) + 360) % 360;
  return (
    <div className="compass-box">
      <div className="label" style={{ top: 4, left: "50%", transform: "translateX(-50%)" }}>N</div>
      <div className="label" style={{ top: "50%", right: 4, transform: "translateY(-50%)" }}>E</div>
      <div className="label" style={{ bottom: 4, left: "50%", transform: "translateX(-50%)" }}>S</div>
      <div className="label" style={{ top: "50%", left: 4, transform: "translateY(-50%)" }}>W</div>
      <div className="center-dot"></div>
      <div className="needle" style={{ transform: `translate(-50%, -100%) rotate(${deg}deg)` }}></div>
    </div>
  );
}

function ValueBar({ value, min, max, level}) {
  if (min == null || max == null) return null;
  const clamped = Math.min(Math.max(value, min), max);
  const percent = ((clamped - min) / (max - min)) * 100;
  
  const color = level === "bad" ? "var(--danger)" : level === "warn" ? "var(--warn)" : "var(--accent)";
  return (
    <div className="value-bar">
      <div className="indicator" style={{ width: `${percent}%` , background: color }}></div>
    </div>
  );
}

export default function SensorCard({ title, value, unit, min, max, prom, overrideStatus }) {
  const numericValue = typeof value === "number" ? value : parseFloat(value);

  // Special case: Direction card
  if (title === "Dir. Viento") {
    return (
      <div className="card direction-card">
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{title}</div>
        <Compass degrees={numericValue} />
        <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
          {numericValue}°
        </div>
      </div>
    );
  }

  // Normal sensor cards
  const status = overrideStatus || computeStatus(title, numericValue);
  const cardLevelClass =
    status.level === "bad" ? "status-alert" : status.level === "warn" ? "status-warning" : "status-good";

  return (
    <div className={`card ${cardLevelClass}`}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "#64748b" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{status.text}</div>
      </div>

      {/* Main metric */}
      <div style={{ marginTop: 12 }}>
        <div className="metric">
          {Number.isFinite(numericValue) ? numericValue.toFixed(1) : "--"}
          {unit ? ` ${unit}` : ""}
        </div>
      </div>

      {/* Footer stats + bar */}
      <ValueBar value={numericValue} min={min} max={max} level={status.level}/>
      <div className="stats-row">
        <div>Min: {min ?? "--"}</div>
        <div>Prom: {prom ?? "--"}</div>
        <div>Max: {max ?? "--"}</div>
      </div>
    </div>
  );
}