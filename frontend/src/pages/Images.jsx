import React from "react";
import ImageModal from "../components/ImageModal";

/* dummy images (replace with actual s3 URLs when you integrate) */
const SAMPLE_IMAGES = Array.from({ length: 8 }).map((_, i) => ({
  id: i + 1,
  src: `https://picsum.photos/seed/crop${i+1}/800/600`,
  analysis: i % 3 === 0 ? { label: "Plaga", confidence: 0.87 } : null
}));

export default function Images() {
  const [selected, setSelected] = React.useState(null);

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Visor de Imágenes</h2>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <select style={{ padding: 8, borderRadius: 8 }}>
            <option>Últimas sesiones</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "8px 12px", borderRadius: 8, background: "#e6eef4" }}>Filtrar</button>
        </div>
      </div>

      <div className="gallery">
        {SAMPLE_IMAGES.map((img) => (
          <div key={img.id} className="thumb card" onClick={() => setSelected(img)} style={{ cursor: "pointer" }}>
            <img src={img.src} alt={`thumb-${img.id}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius:8 }} />
          </div>
        ))}
      </div>

      <ImageModal src={selected?.src} analysis={selected?.analysis} onClose={() => setSelected(null)} />
    </div>
  );
}
