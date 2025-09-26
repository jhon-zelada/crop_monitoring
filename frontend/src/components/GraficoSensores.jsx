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
import * as api from "../lib/api";

const DEFAULT_METRICS = [
  { key: "temperature_c", title: "Temperatura", unit: "°C", color: "text-red-600" },
  { key: "relative_humidity_pct", title: "Humedad Rel.", unit: "%", color: "text-blue-600" },
  { key: "solar_radiance_w_m2", title: "Radiación Solar", unit: "W/m²", color: "text-yellow-600" },
  { key: "wind_speed_m_s", title: "Vel. Viento", unit: "m/s", color: "text-green-600" },
  { key: "wind_direction_deg", title: "Dir. Viento", unit: "°", color: "text-purple-600" },
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

async function fetchMeasurementsFallback(deviceId, hours) {
  if (typeof api.fetchMeasurements === "function") {
    try {
      return await api.fetchMeasurements(deviceId, hours);
    } catch (e) {
      console.warn("api.fetchMeasurements failed", e);
    }
  }

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

export default function GraficoSensores({ initialHours = 24 }) {
  const [devices, setDevices] = React.useState([]);
  const [deviceId, setDeviceId] = React.useState("");
  const [hours, setHours] = React.useState(initialHours);
  const [metrics] = React.useState(DEFAULT_METRICS);
  const [seriesMap, setSeriesMap] = React.useState({});
  const [summaries, setSummaries] = React.useState({});
  const [selectedKey, setSelectedKey] = React.useState(metrics[0].key);
  const [loading, setLoading] = React.useState(false);
  const wsRef = React.useRef(null);

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

  const loadHistory = React.useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
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

      const measurements = await fetchMeasurementsFallback(deviceId, hours);
      const map = {};
      for (const m of metrics) map[m.key] = [];
      for (const row of (measurements || [])) {
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
                  const cutoff = Date.now() - hours * 3600 * 1000;
                  next[key] = arr.filter((p) => new Date(p.time).getTime() >= cutoff);
                }
              }
              return next;
            });
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

  const renderChart = (data, metric) => {
    if (!data || data.length === 0)
      return <div className="text-sm text-gray-400">No hay datos para este rango.</div>;

    return (
      <div className="h-60">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              minTickGap={20}
            />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip
              labelFormatter={(t) => new Date(t).toLocaleString()}
              formatter={(value) => [fmtNumber(value, 2), metric.unit]}
            />
            <Line isAnimationActive={false} type="monotone" dataKey="value" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const selectedMetric = metrics.find((m) => m.key === selectedKey) || metrics[0];
  const selectedSeries = seriesMap[selectedKey] || [];
  const lastValue = selectedSeries.length ? selectedSeries[selectedSeries.length - 1].value : null;

  return (
    <div>
      <div className="banner mb-3 flex items-center justify-between">
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Proyecto quinua</div>
          <div className="kv">Agricultura de Precisión — Monitoreo IoT</div>
        </div>

        <div className="flex items-center gap-3">
          <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className="p-2 rounded-md border">
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
            <option value={17520}>All</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <label htmlFor="metric-select" className="sr-only">
          Seleccionar métrica: 
        </label>
        <select
          id="metric-select"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="select"
        >
          {metrics.map((m) => (
            <option key={m.key} value={m.key}>
              {m.title}
            </option>
          ))}
        </select>

      </div>

      {/* Use your CSS .metric-row to layout chart + summary */}
      <div className="metric-row">
        {/* Chart card */}
        <div className="card">
          <div className="flex items-start justify-between mb-3">
            <div className="text-lg font-semibold">
              {selectedMetric.title} {selectedMetric.unit}
            </div>
          </div>

          <div className="border rounded-md p-3 bg-gray-50">
            {renderChart(selectedSeries, selectedMetric)}

            <div className="mt-3 flex items-center justify-between text-sm text-gray-700">
              <div>
                Último:{" "}
                <span className="font-medium">
                  {lastValue === null ? "—" : `${fmtNumber(lastValue, 2)} ${selectedMetric.unit}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary card */}
        <div className="card">
          <div className="mb-3">
            <div className="text-base font-bold text-gray-800">Resumen de mediciones {hours} horas</div>
          </div>

          <div className="overflow-x-auto">
            <table className="table text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-gray-700 font-semibold">
                  <th className="text-left py-2 pl-1">Parámetro</th>
                  <th className="text-right py-2 pr-4">Min</th>
                  <th className="text-right py-2 pr-4">Prom</th>
                  <th className="text-right py-2 pr-1">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.map((m) => {
                  const series = seriesMap[m.key] || [];
                  const backend = summaries && summaries[m.key];
                  const computed = computeSummaryFromSeries(series);
                  const sum = backend ? { min: backend.min, max: backend.max, avg: backend.avg } : computed;
                  const labelClass = `py-2 pl-1 truncate font-medium ${m.color || "text-gray-800"}`;
                  const numberClass = `py-2 pr-4 text-right ${m.color || "text-gray-700"}`;

                  return (
                    <tr key={m.key} className="align-middle">
                      <td className={labelClass}>{m.title}</td>
                      <td className={numberClass}>{sum.min == null ? "—" : fmtNumber(sum.min, 2)}</td>
                      <td className={numberClass}>{sum.avg == null ? "—" : fmtNumber(sum.avg, 2)}</td>
                      <td className="py-2 pr-1 text-right">{sum.max == null ? "—" : fmtNumber(sum.max, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-gray-400 text-right">
            Actualizado: {loading ? "Cargando…" : "Últimos datos mostrados"}
          </div>
        </div>
      </div>

      {loading && <div className="mt-3 text-sm text-gray-500">Cargando datos…</div>}
    </div>
  );
}
