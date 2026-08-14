import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import favicon from '../assets/favicon.png';
import { validateSelectedFiles, validateSubmission } from "../utils/fileValidation";

export default function VCFUploadPanel({ onLoad }) {
  const [searchParams] = useSearchParams();
  const isCLI = searchParams.get("mode") === "cli";
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
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isCLI) {
      handleCLILoad();
    }
    else {
      // clear out all CLI artifacts when dropping back to Browser Mode
      setVcfFile(null);
      setTbiFile(null);
      setAvailableSamples([]);
      setSelectedSamples([]);
    }
  }, [isCLI]);

  const handleCLILoad = async () => {
    setLoading(true);
    try {
      // Get local file paths from backend 
      const ctxRes = await fetch("/api/local-context");
      if (!ctxRes.ok) throw new Error("CLI context not available");
      const paths = await ctxRes.json();

      if (paths.vcf && paths.tbi) {
        // Set mock file objects so UI shows filenames
        setVcfFile({ name: paths.vcf, isLocal: true });
        setTbiFile({ name: paths.tbi, isLocal: true });

        // Fetch metadata using PATH instead of File object
        // We pass 'vcf_path' so the backend knows to read from disk
        const formData = new FormData();
        formData.append("vcf_path", paths.vcf);

        const metaRes = await fetch("/api/get-vcf-metadata", { 
          method: "POST", 
          body: formData,
          headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
        });
        
        if (!metaRes.ok) throw new Error("Could not read local VCF metadata");
        
        const meta = await metaRes.json();
        if (meta.samples) {
          setAvailableSamples(meta.samples);
          setSelectedSamples([meta.samples[0]]);
        }
      }
    } catch (err) {
      setError("CLI Load Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic  
  const filteredSamples = useMemo(() => {
    return availableSamples.filter(name =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableSamples, searchTerm]);

  const selectFiltered = () => {
    const newSelection = Array.from(new Set([...selectedSamples, ...filteredSamples]));
    setSelectedSamples(newSelection);
  };

  const clearFiltered = () => {
    const newSelection = selectedSamples.filter(name => !filteredSamples.includes(name));
    setSelectedSamples(newSelection);
  };

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    setError("");

    // Use validation checker for file properties
    const fileCheck = validateSelectedFiles(selectedFiles);
    
    if (fileCheck.errorMsg && !fileCheck.vcf) {
      setError(fileCheck.errorMsg);
      return;
    }

    setVcfFile(fileCheck.vcf);
    setTbiFile(fileCheck.tbi);
    setAvailableSamples([]);
    setSelectedSamples([]);

    if (fileCheck.errorMsg && !fileCheck.tbi) {
      setError(fileCheck.errorMsg);
    }

    if (fileCheck.vcf && fileCheck.tbi) {
      const formData = new FormData();
      formData.append("vcf", fileCheck.vcf);

      try {
        const res = await fetch("/api/get-vcf-metadata", { 
          method: "POST", 
          body: formData,
          headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
        });
        if (!res.ok) throw new Error("Could not fetch VCF metadata");
        
        const meta = await res.json();
        if (meta.samples) {
          setAvailableSamples(meta.samples);
          setSelectedSamples([meta.samples[0]]); // Default to first
        }
      } catch (err) {
        console.error("Metadata pre-scan failed:", err);
        setError("Failed to read VCF samples. Check if file is valid.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Run deep validation logic asynchronously
    const submissionCheck = await validateSubmission({ vcfFile, tbiFile, isCLI });
    if (!submissionCheck.isValid) {
      setError(submissionCheck.errorMsg);
      return;
    }

    setLoading(true);

    const finalSelectedNames = selectedSamples.length > 0 
      ? selectedSamples 
      : availableSamples;

    const indices = finalSelectedNames
      .map(name => availableSamples.indexOf(name))
      .filter(idx => idx !== -1);

    const formData = new FormData();
    
    if (vcfFile.isLocal) {
      // Send absolute paths instead of file blobs
      formData.append("vcf_path", vcfFile.name);
      formData.append("tbi_path", tbiFile.name);
    } else {
      // browser upload 
      formData.append("vcf", vcfFile);
      formData.append("tbi", tbiFile);
    }
    
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
        let errorMessage = "Server error";
        try {
          const errorJson = await res.json();
          if (errorJson.detail) errorMessage = errorJson.detail;
        } catch {
          
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
          pageSize: 100,
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

        <button 
          type="button" 
          onClick={() => navigate("/")} 
          style={{ ...styles.linkBtn, marginBottom: "0.625rem" }}
        >
          ← Back to Launch Options
        </button>

        <h2 style={styles.title}>
          <img 
            src={favicon} 
            alt="Logo" 
            style={styles.logoImageStyle} 
          />
        </h2>
        <p style={styles.subtitle}>
          {isCLI ? "CLI Mode: Using local system files" : "Please upload compressed VCF file (.vcf.gz) & its TBI file (.vcf.gz.tbi)"}
        </p>

        {/* Hide input if in CLI mode */}
        {!isCLI && (
          <input
            type="file"
            accept=".vcf, .vcf.gz, .gz, .tbi, application/gzip, application/x-gzip"
            multiple
            onChange={handleFileChange}
            style={styles.fileInput}
          />
        )}

        {vcfFile && (
          <div style={styles.status}>
            <div>🧬 VCF: {vcfFile.name}</div>
            <div>
              📄 TBI:{" "}
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
            style={styles.rowInput}
          />
          <input
            type="number"
            placeholder="Start"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={styles.rowInput}
          />
          <input
            type="number"
            placeholder="End"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={styles.rowInput}
          />
        </div>
        
        {availableSamples.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "#333" }}>
                Samples ({selectedSamples.length} selected)
              </label>
              {/* Global Actions */}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="button" onClick={selectFiltered} style={styles.linkBtn}>
                  {searchTerm ? 'Add Filtered' : 'Select All'}
                </button>
                {searchTerm && (
                  <button type="button" onClick={clearFiltered} style={styles.linkBtn}>
                    Clear Filtered
                  </button>
                )}
                <button type="button" onClick={() => setSelectedSamples([])} style={{ ...styles.linkBtn, color: '#888' }}>
                  Clear All
                </button>
              </div>
            </div>

            <input 
              placeholder="Search samples..." 
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div style={styles.sampleBox}>
              {filteredSamples.map((name) => (
                <label key={name} style={styles.sampleLabel}>
                  <input
                    type="checkbox"
                    checked={selectedSamples.includes(name)}
                    onChange={(e) => {
                      const newSelection = e.target.checked 
                        ? [...selectedSamples, name]
                        : selectedSamples.filter(s => s !== name);
                      setSelectedSamples(newSelection);
                    }}
                  />
                  {name}
                </label>
              ))}
            </div>
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
    padding: "1rem"
  },
  card: {
    width: "100%",
    maxWidth: "44rem",
    padding: "1.875rem",
    borderRadius: "0.75rem",
    background: "#fff",
    boxShadow: "0 1.875rem 1.875rem rgba(0,0,0,0.1)",
    boxSizing: "border-box"
  },
  title: {
    margin: 0,
    marginBottom: "0.775rem",
    textAlign: "center"
  },
  subtitle: {
    fontSize: "0.96rem",
    color: "#444",
    textAlign: "center",
    marginBottom: "1rem",
  },
  fileInput: {
    width: "100%",
    marginBottom: "0.75rem",
    fontSize: "0.9rem",
    padding: "0 0",   // Increases overall click target area
    cursor: "pointer"

  },
  status: {
    fontSize: "0.8125rem",
    marginBottom: "0.625rem"
  },
  error: {
    color: "#b00020",
    fontSize: "0.8125rem",
    marginBottom: "0.625rem"
  },
  row: {
    display: "flex",
    gap: "0.6rem",
    marginBottom: "0.875rem",
    height: "2rem"
  },
  rowInput: {
    flex: 1,
    padding: "0.5rem",
    border: "0.0625rem solid #ccc",
    borderRadius: "0.375rem",
    fontSize: "0.8125rem",
    outline: "none"
  },
  button: {
    width: "100%",
    padding: "0.625rem",
    fontWeight: 600,
    borderRadius: "0.5rem",
    border: "none",
    background: "#328547ff",
    color: "#fff",
    cursor: "pointer",
    opacity: 1,
    fontSize: "0.875rem"
  },
  searchInput: {
    width: "100%",
    padding: "0.5rem",
    marginBottom: "0.5rem",
    border: "0.0625rem solid #ddd",
    borderRadius: "0.375rem",
    fontSize: "0.8125rem",
    boxSizing: "border-box",
    outline: "none"
  },
  sampleBox: {
    maxHeight: "9.375rem",
    overflowY: "auto",
    border: "0.0625rem solid #ccc",
    borderRadius: "0.375rem",
    padding: "0.5rem",
    background: "#fafafa" 
  },
  sampleLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.25rem 0",
    cursor: "pointer",
    fontSize: "0.9rem"
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#328547",
    fontSize: "0.9rem",
    fontWeight: "bold",
    cursor: "pointer",
    padding: 0
  },
  logoImageStyle: {
    width: "7.75rem",
    height: "7.75rem",
    borderRadius: "0.5rem",
    objectFit: "contain"
  }
};