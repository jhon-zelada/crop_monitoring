import React from "react";
import ImageModal from "./ImageModal";

export default function Images() {
  const [images, setImages] = React.useState([]); // uploaded images
  const [selected, setSelected] = React.useState(null);

  // handle uploads
  const handleUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file, i) => ({
      id: `${file.name}-${i}-${Date.now()}`,
      src: URL.createObjectURL(file), // previewable blob URL
      analysis: null, // can fill in later if you do AI analysis
      name: file.name,
    }));
    setImages((prev) => [...prev, ...newImages]);
  };

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Visor de Imágenes</h2>

      {/* Upload control */}
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="file-upload"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Subir Imágenes
        </label>
        <input
          id="file-upload"
          type="file"
          multiple
          accept="image/*"
          onChange={handleUpload}
          className="visually-hidden"
        />
      </div>

      {images.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            border: "2px dashed var(--card-border)",
            borderRadius: 12,
            color: "var(--muted)",
          }}
        >
          No hay imágenes todavía. Sube algunas para comenzar.
        </div>
      ) : (
        <div className="gallery">
          {images.map((img) => (
            <div
              key={img.id}
              className="thumb card"
              onClick={() => setSelected(img)}
              style={{ cursor: "pointer" }}
            >
              <img
                src={img.src}
                alt={img.name}
                style={{
                  width: "60%",
                  height: "60%",
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <ImageModal
        src={selected?.src}
        analysis={selected?.analysis}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
