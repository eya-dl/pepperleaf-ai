import React, { useState, useRef, useCallback } from "react";

// Adapté au backend FastAPI fourni :
// POST http://localhost:8000/predict  (multipart/form-data, champ "file")
// -> { class: "Early Blight" | "Late Blight" | "Healthy", confidence: 0.0-1.0 }

const API_URL = `${import.meta.env.VITE_API_URL}/predict`;


const STATUS_STYLES = {
  "Pepper__bell___Bacterial_spot": { color: "#f50909", bg: "#EAF2E6", label: "Feuille malade" },
  "Pepper__bell___healthy": { color: "#3F6B3A", bg: "#EAF2E6", label: "Feuille saine" },
};

export default function PotatoDiseaseDetector() {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (!f || !f.type.startsWith("image/")) {
      setError("Merci de sélectionner un fichier image.");
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Le serveur a répondu avec le statut ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(
        "Impossible de joindre le serveur d'analyse. Vérifiez que l'API tourne sur " +
          API_URL
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const statusStyle = result ? STATUS_STYLES[result.class] : null;

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .pd-dropzone:hover { border-color: #6B8E5A; }
      `}</style>

      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.eyebrowDot} />
          <div>
            <h1 style={styles.title}>Diagnostic feuille de pomme de terre</h1>
            <p style={styles.subtitle}>
              Déposez une photo de feuille pour détecter le mildiou précoce,
              tardif, ou confirmer qu'elle est saine.
            </p>
          </div>
        </div>

        <div
          className="pd-dropzone"
          style={{
            ...styles.dropzone,
            borderColor: dragOver ? "#6B8E5A" : "#D8D2C4",
            backgroundColor: dragOver ? "#F3F6EF" : "#FAF8F3",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onInputChange}
            style={{ display: "none" }}
          />

          {preview ? (
            <img src={preview} alt="Aperçu de la feuille" style={styles.preview} />
          ) : (
            <div style={styles.dropzoneEmpty}>
              <span style={styles.leafIcon}>🥔</span>
              <p style={styles.dropzoneText}>
                Cliquez ou glissez une image ici
              </p>
              <p style={styles.dropzoneHint}>JPG, PNG — une feuille par image</p>
            </div>
          )}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.actions}>
          <button
            onClick={analyze}
            disabled={!file || loading}
            style={{
              ...styles.primaryButton,
              opacity: !file || loading ? 0.5 : 1,
              cursor: !file || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <>
                <span style={styles.spinner} /> Analyse en cours
              </>
            ) : (
              "Analyser la feuille"
            )}
          </button>

          {(file || result) && !loading && (
            <button onClick={reset} style={styles.secondaryButton}>
              Réinitialiser
            </button>
          )}
        </div>

        {result && statusStyle && (
          <div style={{ ...styles.result, backgroundColor: statusStyle.bg }}>
            <div style={styles.resultRow}>
              <span style={{ ...styles.resultDot, backgroundColor: statusStyle.color }} />
              <span style={{ ...styles.resultLabel, color: statusStyle.color }}>
                {statusStyle.label}
              </span>
            </div>
            <div style={styles.confidenceTrack}>
              <div
                style={{
                  ...styles.confidenceFill,
                  width: `${(result.confidence * 100).toFixed(1)}%`,
                  backgroundColor: statusStyle.color,
                }}
              />
            </div>
            <p style={styles.confidenceText}>
              Confiance du modèle : {(result.confidence * 100).toFixed(1)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    backgroundColor: "#F4F1E9",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    boxShadow: "0 1px 3px rgba(43,58,42,0.08), 0 8px 24px rgba(43,58,42,0.06)",
    border: "1px solid #EDE8DB",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 24,
  },
  eyebrowDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: "#5B8C5A",
    marginTop: 6,
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#2B3A2A",
    lineHeight: 1.3,
  },
  subtitle: {
    margin: "6px 0 0",
    fontSize: 14,
    color: "#6E6A5E",
    lineHeight: 1.5,
  },
  dropzone: {
    border: "2px dashed #D8D2C4",
    borderRadius: 12,
    padding: 20,
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.15s, background-color 0.15s",
    minHeight: 180,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dropzoneEmpty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  leafIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  dropzoneText: {
    margin: 0,
    fontSize: 14,
    color: "#4A473D",
    fontWeight: 500,
  },
  dropzoneHint: {
    margin: 0,
    fontSize: 12,
    color: "#9B9686",
  },
  preview: {
    maxWidth: "100%",
    maxHeight: 220,
    borderRadius: 8,
    objectFit: "cover",
  },
  error: {
    color: "#A13A2E",
    fontSize: 13,
    marginTop: 12,
    marginBottom: 0,
  },
  actions: {
    display: "flex",
    gap: 10,
    marginTop: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#3F6B3A",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    color: "#6E6A5E",
    border: "1px solid #D8D2C4",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  spinner: {
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "#FFFFFF",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.7s linear infinite",
  },
  result: {
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
  },
  resultRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  resultDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
  },
  resultLabel: {
    fontSize: 15,
    fontWeight: 700,
  },
  confidenceTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.4s ease",
  },
  confidenceText: {
    margin: "8px 0 0",
    fontSize: 12,
    color: "#6E6A5E",
  },
};