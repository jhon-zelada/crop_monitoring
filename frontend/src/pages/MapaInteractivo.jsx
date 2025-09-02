// src/pages/MapaInteractivo.jsx
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/*
  Sample stations array. Replace this with your API data.
  Each station: { id, name, coords: [lat, lon], status: "online" | "alert" | "offline", lastSeen }
*/
const SAMPLE_STATIONS = [
  { id: "ES-001", name: "Estación Norte", coords: [-7.490105, -79.526833], status: "online", lastSeen: "2025-09-01 10:24" },
];

const STATUS_COLORS = {
  online: "#10b981",   // green
  alert:  "#f59e0b",   // yellow/amber
  offline:"#ef4444",   // red
};

export default function MapaInteractivo({ stations = SAMPLE_STATIONS /* or pass real data as prop */ }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  // keep track of which groups are visible (used by Legend UI)
  const [visible, setVisible] = useState({ online: true, alert: true, offline: true });

  // groupsRef holds LayerGroup instances so we can toggle them later
  const groupsRef = useRef({ online: null, alert: null, offline: null });

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return; // already initialized

    // create map
    const map = L.map(containerRef.current, {
      center: stations.length ? stations[0].coords : [-7.490105, -79.526833],
      zoom: 13,
      preferCanvas: true,
    });

    // base layers
    const street = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles © Esri — Source: Esri, HERE, Garmin, FAO, NOAA, USGS",
        maxZoom: 17,
      }
    );

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Imagery © Esri",
        maxZoom: 17,
      }
    );

    // Make satellite the default view (per your request)
    satellite.addTo(map);

    // create per-status groups
    const onlineGroup = L.layerGroup();
    const alertGroup = L.layerGroup();
    const offlineGroup = L.layerGroup();

    groupsRef.current = { online: onlineGroup, alert: alertGroup, offline: offlineGroup };

    // convenience to create a circle marker for a station
    const createMarker = (st) => {
      const color = STATUS_COLORS[st.status] || "#6b7280";
      const marker = L.circleMarker(st.coords, {
        radius: 8,
        weight: 2,
        color: "#ffffff",      // white border
        fillColor: color,
        fillOpacity: 0.95,
      });

      const popupHtml = `
        <div style="font-weight:700; margin-bottom:6px;">${st.name}</div>
        <div style="font-size:13px;">ID: ${st.id}</div>
        <div style="font-size:13px;">Estado: ${st.status}</div>
        <div style="font-size:12px; color:#6b7280; margin-top:6px;">Última conexión: ${st.lastSeen ?? "—"}</div>
      `;
      marker.bindPopup(popupHtml, { minWidth: 180 });

      return marker;
    };

    // add markers into groups
    const markerList = [];
    stations.forEach((st) => {
      const m = createMarker(st);
      markerList.push(m);
      if (st.status === "online") onlineGroup.addLayer(m);
      else if (st.status === "alert") alertGroup.addLayer(m);
      else offlineGroup.addLayer(m);
    });

    // add groups to the map according to initial visibility
    if (visible.online)  onlineGroup.addTo(map);
    if (visible.alert)   alertGroup.addTo(map);
    if (visible.offline) offlineGroup.addTo(map);

    // layer control (baseMaps, overlays)
    const baseMaps = { "Satélite": satellite, "Calles": street };
    const overlays = { "Online": onlineGroup, "Alerta": alertGroup, "Desconectado": offlineGroup };
    L.control.layers(baseMaps, overlays, { collapsed: false }).addTo(map);

    // fit bounds if we have markers
    if (markerList.length > 0) {
      const groupForBounds = L.featureGroup(markerList);
      if (groupForBounds.getBounds && groupForBounds.getBounds().isValid()) {
        map.fitBounds(groupForBounds.getBounds().pad(0.12));
      }
    }

    // ensure map measures correctly after layout (card) finishes rendering
    map.whenReady(() => {
      requestAnimationFrame(() => map.invalidateSize(true));
    });

    // keep reference and cleanup
    mapRef.current = map;

    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
    };
  }, []); // initialize once

  // Toggle group visibility (also updates the Legend UI)
  const toggleStatus = (status) => {
    const map = mapRef.current;
    const group = groupsRef.current?.[status];
    if (!map || !group) return;

    if (map.hasLayer(group)) {
      map.removeLayer(group);
      setVisible((v) => ({ ...v, [status]: false }));
    } else {
      group.addTo(map);
      setVisible((v) => ({ ...v, [status]: true }));
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Mapa Interactivo</h2>

      {/* responsive two-column: map card + legend card */}
      <div className="map-layout" style={{ marginTop: 8 }}>
        {/* Map Card */}
        <div className="card map-card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--card-border)" }}>
            <div style={{ fontWeight: 700 }}>Mapa - Estaciones</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{stations.length} estaciones</div>
          </div>
          <div className="map-box" ref={containerRef} />
        </div>

        {/* Legend Card */}
        <div className="card legend-card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Leyenda</div>

          <div className={`legend-item ${visible.online ? "" : "inactive"}`} onClick={() => toggleStatus("online")} style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", padding: 8, borderRadius: 8 }}>
            <span className="legend-dot" style={{ background: STATUS_COLORS.online }} />
            <div>
              <div style={{ fontWeight: 700 }}>Online</div>
              <div className="kv">Color verde — estación funcionando</div>
            </div>
          </div>

          <div className={`legend-item ${visible.alert ? "" : "inactive"}`} onClick={() => toggleStatus("alert")} style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", padding: 8, borderRadius: 8, marginTop: 8 }}>
            <span className="legend-dot" style={{ background: STATUS_COLORS.alert }} />
            <div>
              <div style={{ fontWeight: 700 }}>Alerta</div>
              <div className="kv">Color amarillo — revisión necesaria</div>
            </div>
          </div>

          <div className={`legend-item ${visible.offline ? "" : "inactive"}`} onClick={() => toggleStatus("offline")} style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", padding: 8, borderRadius: 8, marginTop: 8 }}>
            <span className="legend-dot" style={{ background: STATUS_COLORS.offline }} />
            <div>
              <div style={{ fontWeight: 700 }}>Desconectado</div>
              <div className="kv">Color rojo — estación sin conexión</div>
            </div>
          </div>

          <hr style={{ margin: "12px 0", border: "none", borderTop: "1px solid var(--card-border)" }} />

          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Tip: haz clic sobre la leyenda para mostrar/ocultar grupos de marcadores. También puedes usar el control de capas en el mapa para cambiar entre Satélite / Calles.
          </div>
        </div>
      </div>
    </div>
  );
}
