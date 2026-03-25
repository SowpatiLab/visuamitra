import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function VCFUploadPanel({ onLoad }) {
  const navigate = useNavigate();
  const [vcfFile, setVcfFile] = useState(null);
  const [tbiFile, setTbiFile] = useState(null);
  const [chr, setChr] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [availableSamples, setAvailableSamples] = useState([]);
  const [selectedSamples, setSelectedSamples] = useState([]);

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    setError("");

    const vcf = selectedFiles.find((f) => f.name.endsWith(".vcf.gz"));
    if (!vcf) {
      setError("Please select a .vcf.gz file");
      return;
    }

    const expectedTbiName = `${vcf.name}.tbi`;
    const tbi = selectedFiles.find((f) => f.name === expectedTbiName);

    setVcfFile(vcf);
    setTbiFile(tbi || null);

    if (vcf && tbi) {
      const formData = new FormData();
      formData.append("vcf", vcf);
      formData.append("tbi", tbi);
      formData.append("page_size", 1); // Only need the header/first row

      try {
        const res = await fetch("/api/vcf-to-tsv-cursor", { method: "POST", body: formData });
        const text = await res.text();
        const sampleLine = text.split("\n").find(l => l.startsWith("##SAMPLES"));
        if (sampleLine) {
          const names = sampleLine.split("\t")[1].split(",").map(n => n.trim());
          setAvailableSamples(names);
          setSelectedSamples([names[0]]); // Default to first sample
        }
      } catch (err) {
        console.error("Sample pre-scan failed:", err);
      }
    }

    if (!tbi) {
      setError(
        `Index file not found. Expected "${expectedTbiName}" in the same folder.`
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vcfFile || !tbiFile)  {
      setError("No files selected to visualize");
      return;
    };

    setLoading(true);
    setError("");

    // 1. Determine final selection (Default to ALL if empty)
    const finalSelectedNames = selectedSamples.length > 0 
      ? selectedSamples 
      : availableSamples;

    const indices = finalSelectedNames
    .map(name => availableSamples.indexOf(name))
    .filter(idx => idx !== -1);

    const formData = new FormData();
    formData.append("vcf", vcfFile);
    formData.append("tbi", tbiFile);
    if (chr) formData.append("chr", chr);
    if (start) formData.append("start", start);
    if (end) formData.append("end", end);
    
    if (indices.length > 0) {
      formData.append("samples", indices.join(","));
    }

    try {
      const res = await fetch("/api/vcf-to-tsv-cursor", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
      // Try to parse validation response from backend
      let errorMessage = "Server error";
      try {
        const errorJson = await res.json();
        if (errorJson.detail) errorMessage = errorJson.detail;
      } catch {
        // fallback
      }
      throw new Error(errorMessage);
    }

    const text = await res.text();
    navigate("/viewer", {
      state: {
        vcfFile,
        tbiFile,
        chr,
        start,
        endPos: end,
        pageSize: 10,
        lastCursor: res.headers.get("X-Next-Cursor") || null,
        tsvText: text,
        allSamples: availableSamples,
        selectedSamples: selectedSamples,
        initialIndices: indices.length > 0 ? indices : availableSamples.map((_, i) => i)
      },
    });
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h2 style={styles.title}>VisuaMiTRa</h2>
        <p style={styles.subtitle}>
          Upload a compressed VCF file. The index (.tbi) must be in the same
          folder.
        </p>

        <input
          type="file"
          accept=".vcf.gz,.tbi"
          multiple
          onChange={handleFileChange}
          style={styles.fileInput}
        />

        {vcfFile && (
          <div style={styles.status}>
            <div>📄 VCF: {vcfFile.name}</div>
            <div>
              🧬 TBI:{" "}
              {tbiFile ? (
                <span style={{ color: "green" }}>found</span>
              ) : (
                <span style={{ color: "red" }}>missing</span>
              )}
            </div>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.row}>
          <input
            placeholder="Chromosome (chr1)"
            value={chr}
            onChange={(e) => setChr(e.target.value)}
          />
          <input
            type="number"
            placeholder="Start"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <input
            type="number"
            placeholder="End"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        
        {availableSamples.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: "14px", fontWeight: "600", color: "#333", display: "block", marginBottom: 6 }}>
              Select Samples ({selectedSamples.length} selected):
            </label>
            <div style={{ 
              maxHeight: "120px", 
              overflowY: "auto", 
              border: "1px solid #ccc", 
              borderRadius: "6px",
              padding: "8px",
              background: "#fafafa" 
            }}>
              {availableSamples.map((name) => (
                <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", cursor: "pointer", fontSize: "13px" }}>
                  <input
                    type="checkbox"
                    checked={selectedSamples.includes(name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSamples([...selectedSamples, name]);
                      } else {
                        setSelectedSamples(selectedSamples.filter(s => s !== name));
                      }
                    }}
                  />
                  {name}
                </label>
              ))}
            </div>
            <small style={{ color: "#777", fontSize: "11px" }}>If left empty, all samples will be loaded.</small>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          style={styles.button}
        >
          {loading ? "Processing…" : "Load & Visualize"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f5f7fa, #e4e9f0)",
  },
  card: {
    width: 550,
    padding: 24,
    borderRadius: 12,
    background: "#fff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
  },
  title: {
    margin: 0,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    marginBottom: 16,
  },
  fileInput: {
    width: "100%",
    marginBottom: 12,
  },
  status: {
    fontSize: 13,
    marginBottom: 10,
  },
  error: {
    color: "#b00020",
    fontSize: 13,
    marginBottom: 10,
  },
  row: {
    display: "flex",
    gap: 8,
    marginBottom: 14,
  },
  button: {
    width: "100%",
    padding: 10,
    fontWeight: 600,
    borderRadius: 8,
    border: "none",
    background: "#328547ff",
    color: "#fff",
    cursor: "pointer",
    opacity: 1,
  },
};
