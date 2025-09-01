import React from "react";

export default function ImageModal({ src, onClose, analysis }) {
  if (!src) return null;
  return (
    <div style={{
      position: "fixed", inset:0, background: "rgba(0,0,0,0.6)", display: "grid",
      placeItems: "center", zIndex: 60
    }}>
      <div style={{ width: "90%", maxWidth: 1000, background: "#fff", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: 8 }}>
          <button onClick={onClose} style={{ border: "none", background: "#ef4444", color: "#fff", padding: "8px 12px", borderRadius: 8 }}>Cerrar</button>
        </div>
        <div style={{ padding: 10 }}>
          <img src={src} alt="frame" style={{ width: "100%", display: "block", borderRadius: 6 }} />
          {analysis && <pre style={{ marginTop: 8, background: "#f8fafc", padding: 8, borderRadius: 6 }}>{JSON.stringify(analysis, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
}
