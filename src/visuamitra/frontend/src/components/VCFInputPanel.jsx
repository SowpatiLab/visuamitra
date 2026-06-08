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
          body: formData 
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

    if (fileCheck.errorMsg && !fileCheck.tbi) {
      setError(fileCheck.errorMsg);
    }

    if (fileCheck.vcf && fileCheck.tbi) {
      const formData = new FormData();
      formData.append("vcf", fileCheck.vcf);

      try {
        const res = await fetch("/api/get-vcf-metadata", { method: "POST", body: formData });
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

    // Run deep validation validation logic asynchronously
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
          style={{ ...styles.linkBtn, marginBottom: 10 }}
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
          {isCLI ? "CLI Mode: Using local system files" : "Upload compressed VCF file (.vcf.gz) & its TBI file (.vcf.gz.tbi)"}
        </p>

        {/* Hide input if in CLI mode */}
        {!isCLI && (
          <input
            type="file"
            accept=".vcf.gz,.tbi"
            multiple
            onChange={handleFileChange}
            style={styles.fileInput}
          />
        )}

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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                Samples ({selectedSamples.length} selected)
              </label>
              {/* Global Actions */}
              <div style={{ display: "flex", gap: "12px" }}>
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
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f5f7fa, #e4e9f0)",
  },
  card: {
    width: 600, padding: 30, borderRadius: 12, background: "#fff", boxShadow: "0 30px 30px rgba(0,0,0,0.1)",
  },
  title: {
    margin: 0, marginBottom: 6, textAlign: "center",
  },
  subtitle: {
    fontSize: 13, color: "#555", textAlign: "center", marginBottom: 16,
  },
  fileInput: {
    width: "100%", marginBottom: 12,
  },
  status: {
    fontSize: 13, marginBottom: 10,
  },
  error: {
    color: "#b00020", fontSize: 13, marginBottom: 10,
  },
  row: {
    display: "flex", gap: 8, marginBottom: 14,
  },
  button: {
    width: "100%", padding: 10, fontWeight: 600, borderRadius: 8, border: "none", background: "#328547ff", color: "#fff", cursor: "pointer", opacity: 1,
  },
  searchInput: {
    width: "100%", padding: "8px", marginBottom: "8px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", outline: "none"
  },
  sampleBox: {
    maxHeight: "150px", overflowY: "auto", border: "1px solid #ccc", borderRadius: "6px", padding: "8px", background: "#fafafa" 
  },
  sampleLabel: {
    display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", cursor: "pointer", fontSize: "13px"
  },
  linkBtn: {
    background: "none", border: "none", color: "#328547", fontSize: "11px", fontWeight: "bold", cursor: "pointer", padding: 0
  },
  logoImageStyle: {
    width: "100px", height: "100px", borderRadius: 8, objectFit: "contain"
  }
};