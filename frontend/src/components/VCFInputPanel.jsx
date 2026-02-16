import React, { useState } from "react";

export default function VCFUploadPanel({ onLoad }) {
  const [vcfFile, setVcfFile] = useState(null);
  const [tbiFile, setTbiFile] = useState(null);
  const [chr, setChr] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
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

    if (!tbi) {
      setError(
        `Index file not found. Expected "${expectedTbiName}" in the same folder.`
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vcfFile || !tbiFile) return;

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("vcf", vcfFile);
    formData.append("tbi", tbiFile);
    if (chr) formData.append("chr", chr);
    if (start) formData.append("start", start);
    if (end) formData.append("end", end);

    try {
      const res = await fetch("http://localhost:8001/api/vcf-to-tsv-upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Server error");

      const text = await res.text();
      onLoad(text);
    } catch (err) {
      console.error(err);
      setError("Failed to parse VCF. Check backend logs.");
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

        <button
          type="submit"
          disabled={loading || !vcfFile || !tbiFile}
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
