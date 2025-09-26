import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import * as api from "../lib/api"; // we'll use fetchSummary, openLive, and try api.fetchMeasurements if present

// GraficoSensores.jsx
// - Shows a sparkline + summary card for every metric
// - Clicking a card opens a larger chart for that metric
// - Fetches historical series (tries api.fetchMeasurements, otherwise falls back to
//   a REST fetch to /api/v1/devices/:id/measurements?hours=...)
// - Subscribes to live WS via api.openLive and appends points to series
// - Tailwind-friendly styling; uses recharts for charts

const DEFAULT_METRICS = [
  { key: "temperature_c", title: "Temperatura", unit: "°C" },
  { key: "relative_humidity_pct", title: "Humedad Rel.", unit: "%" },
  { key: "solar_radiance_w_m2", title: "Radiación Solar", unit: "W/m²" },
  { key: "wind_speed_m_s", title: "Vel. Viento", unit: "m/s" },
  { key: "wind_direction_deg", title: "Dir. Viento", unit: "°" },
];

function fmtNumber(v, digits = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return Number(v).toFixed(digits);
}

function computeSummaryFromSeries(series) {
  if (!series || series.length === 0) return { min: null, max: null, avg: null };
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const p of series) {
    const v = Number(p.value);
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, avg: sum / series.length };
}

export default function GraficoSensores({ initialHours = 24 }) {
  const [devices, setDevices] = React.useState([]);
  const [deviceId, setDeviceId] = React.useState("");
  const [hours, setHours] = React.useState(initialHours);
  const [metrics] = React.useState(DEFAULT_METRICS);
  const [seriesMap, setSeriesMap] = React.useState({}); // { metricKey: [{time, value}] }
  const [summaries, setSummaries] = React.useState({}); // raw summary from backend (min,max,avg)
  const [selectedKey, setSelectedKey] = React.useState(metrics[0].key);
  const [loading, setLoading] = React.useState(false);
  const wsRef = React.useRef(null);

  // fetch devices (same endpoint your Dashboard uses)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/devices");
        if (!res.ok) throw new Error("failed to fetch devices");
        const data = await res.json();
        if (!mounted) return;
        setDevices(data || []);
        if (data && data.length > 0) setDeviceId(data[0].id);
      } catch (e) {
        console.error("GraficoSensores: fetch devices failed", e);
      }
    })();
    return () => (mounted = false);
  }, []);

  // helper to attempt to use api.fetchMeasurements if exported, otherwise REST fallback
async function fetchMeasurementsFallback(deviceId, hours) {
  // First try to use the api helper (preferred)
  if (typeof api.fetchMeasurements === "function") {
    try {
      return await api.fetchMeasurements(deviceId, hours);
    } catch (e) {
      console.warn("api.fetchMeasurements failed", e);
    }
  }

  // Manual fallback with Authorization header
  try {
    const token = localStorage.getItem("access_token");
    const url = `/api/v1/devices/${deviceId}/measurements?hours=${hours}`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!resp.ok) throw new Error(`measurements fetch failed: ${resp.status}`);
    return await resp.json();
  } catch (e) {
    console.warn("fallback measurements fetch failed", e);
    return [];
  }
}


  // load history + summary when deviceId or hours change
  const loadHistory = React.useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      // fetch summary using your existing api helper if available
      let summary = null;
      try {
        if (typeof api.fetchSummary === "function") {
          summary = await api.fetchSummary(deviceId, hours);
        } else {
          const sres = await fetch(`/api/v1/devices/${deviceId}/summary?hours=${hours}`);
          if (!sres.ok) throw new Error("summary fetch failed");
          summary = await sres.json();
        }
      } catch (e) {
        console.warn("Could not fetch summary via API helper; trying REST fallback", e);
      }

      if (summary) {
        setSummaries(summary);
      }

      // fetch timeseries
      const measurements = await fetchMeasurementsFallback(deviceId, hours);
      // measurements expected: array of objects with a timestamp/time field and metric keys
      const map = {};
      for (const m of metrics) map[m.key] = [];
      for (const row of (measurements || [])) {
        // deduce timestamp property name
        const t = row.time || row.timestamp || row.ts || row.created_at || row.date;
        const time = t ? new Date(t).toISOString() : new Date().toISOString();
        for (const m of metrics) {
          const v = row[m.key];
          if (v === null || v === undefined) continue;
          const n = Number(v);
          if (Number.isNaN(n)) continue;
          map[m.key].push({ time, value: n });
        }
      }
      // sort series
      for (const k of Object.keys(map)) {
        map[k].sort((a, b) => new Date(a.time) - new Date(b.time));
      }
      setSeriesMap(map);
    } catch (e) {
      console.error("loadHistory failed", e);
    } finally {
      setLoading(false);
    }
  }, [deviceId, hours, metrics]);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // live WS subscription (similar to Dashboard)
  React.useEffect(() => {
    if (!deviceId) return;
    const ws = api.openLive(deviceId);
    wsRef.current = ws;
    ws.onopen = () => console.debug("GraficoSensores: live WS open");
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "measurement") {
          if (!deviceId || msg.device_id === deviceId) {
            const d = msg.data || {};
            const time = msg.time || msg.timestamp || new Date().toISOString();
            setSeriesMap((prev) => {
              const next = { ...prev };
              for (const m of metrics) {
                const key = m.key;
                const nv = d[key];
                if (typeof nv === "number") {
                  const arr = (next[key] || []).concat({ time, value: Number(nv) });
                  // trim old points outside the window (hours)
                  const cutoff = Date.now() - hours * 3600 * 1000;
                  next[key] = arr.filter((p) => new Date(p.time).getTime() >= cutoff);
                }
              }
              return next;
            });

            // optionally update summaries locally (recompute from seriesMap) — we keep it simple here
          }
        }
      } catch (e) {
        console.warn("GraficoSensores WS parse error", e);
      }
    };
    ws.onerror = (e) => console.warn("GraficoSensores WS error", e);
    ws.onclose = (e) => console.debug("GraficoSensores WS closed", e);

    return () => {
      try {
        ws.close();
      } catch (e) {}
    };
  }, [deviceId, hours, metrics]);



  const renderSparkline = (data, metric) => {
    if (!data || data.length === 0) return <div className="text-xs text-gray-400">no data</div>;
    
    return (
      <div className="w-full h-10">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
          >
            {/* Grid for readability */}
            <CartesianGrid strokeDasharray="3 3" />

            {/* X axis = time */}
            <XAxis
              dataKey="time"
              tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              label={{ value: "Tiempo", position: "bottom", offset: 0 }}
            />

            {/* Y axis = value */}
            
            <YAxis
              label={{
                value: `${metric.title} (${metric.unit})`,
                angle: -90,
                position: "insideLeft",
              }}
            />

            <Tooltip
              labelFormatter={(t) =>
                new Date(t).toLocaleString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              }
              formatter={(value) => [fmtNumber(value, 2), metric.unit]}

            />

            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="value"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        

      </div>
    );
  };

  const selectedSeries = seriesMap[selectedKey] || [];
  const selectedSummaryBackend = (summaries && summaries[selectedKey]) || null;
  const selectedSummaryComputed = computeSummaryFromSeries(selectedSeries);

  return (
    <div>
      <div className="banner mb-3 flex items-center justify-between">
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Proyecto quinua</div>
          <div className="kv">Agricultura de Precisión — Monitoreo IoT</div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="p-2 rounded-md border"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="p-2 rounded-md border"
            title="Rango de horas"
          >
            <option value={1}>1h</option>
            <option value={6}>6h</option>
            <option value={12}>12h</option>
            <option value={24}>24h</option>
            <option value={72}>72h</option>
            <option value={168}>7d</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {metrics.map((m) => {
          const series = seriesMap[m.key] || [];
          const last = series.length ? series[series.length - 1].value : null;
          const backend = summaries && summaries[m.key];
          const computed = computeSummaryFromSeries(series);
          const sum = backend ? { min: backend.min, max: backend.max, avg: backend.avg } : computed;

          return (
            <div key={m.key} className="metric-row">
              {/* Chart card */}
              <div
                className={`card metric-card cursor-pointer transition ${
                  selectedKey === m.key ? "ring-2 ring-accent" : ""
                }`}
                onClick={() => setSelectedKey(m.key)}
              >
                <div className="metric-head">
                  <div>
                    <div className="metric-title">{m.title}</div>
                    <div className="text-xs text-gray-500">{m.unit}</div>
                  </div>
                  <div className="text-right">
                    <div className="metric-value">
                      {last !== null ? fmtNumber(last, 2) : "—"}
                    </div>
                    <div className="metric-sub">último</div>
                  </div>
                </div>

                <div className="mt-3">{renderSparkline(series,m)}</div>
              </div>

              {/* Summary card */}
              <div className="card metric-card flex flex-col justify-center">
                <div className="stats-row">
                  <span>min</span>
                  <span>{sum.min === null ? "—" : fmtNumber(sum.min)}</span>
                </div>
                <div className="stats-row">
                  <span>avg</span>
                  <span>{sum.avg === null ? "—" : fmtNumber(sum.avg)}</span>
                </div>
                <div className="stats-row">
                  <span>max</span>
                  <span>{sum.max === null ? "—" : fmtNumber(sum.max)}</span>
                </div>
                <div className="mt-3 text-xs text-muted text-right">
                  {(series && series.length) || 0} pts
                </div>
              </div>
            </div>
          );
        })}
      </div>



      {loading && <div className="mt-3 text-sm text-gray-500">Cargando datos…</div>}
    </div>
  );
}
