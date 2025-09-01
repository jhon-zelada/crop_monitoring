import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* default center (replace with your actual farm coordinates) */
const DEFAULT_CENTER = [-13.632, -72.872]; // Lat, Lon (Peru example)
const DEFAULT_ZOOM = 13;

export default function MapaInteractivo() {
  const mapRef = useRef(null);
  const containerRef = useRef();

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return; // only init once

    // init map
    const map = L.map(containerRef.current, { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    mapRef.current = map;

    // Use OpenStreetMap tiles (change to satellite provider later)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    // Add marker for station (since your weather station has known, static coords)
    L.marker(DEFAULT_CENTER).addTo(map).bindPopup("Estación meteorológica (ubicación registrada)");

    return () => map.remove();
  }, []);

return (
  <div>
    <h2 style={{ marginBottom: 12 }}>Mapa Interactivo</h2>
    <div className="map-box" ref={containerRef}></div>
  </div>
);

}
