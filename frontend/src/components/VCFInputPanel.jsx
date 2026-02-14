import React, { useState } from "react";

export default function VCFUploadPanel({ onLoad }) {
  const [files, setFiles] = useState([]);
  const [chr, setChr] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const vcf = files.find((f) => f.name.endsWith(".vcf.gz"));
    const tbi = files.find((f) => f.name.endsWith(".tbi"));

    if (!vcf || !tbi) {
      alert("Please select both .vcf.gz and .tbi files");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("vcf", vcf);
    formData.append("tbi", tbi);
    if (chr) formData.append("chr", chr);
    if (start) formData.append("start", start);
    if (end) formData.append("end", end);

    try {
      const response = await fetch(
        "http://localhost:8001/api/vcf-to-tsv-upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const tsvText = await response.text();
      onLoad(tsvText);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch TSV from backend. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20, border: "1px solid #ccc" }}>
      <h3>Upload VCF + Index</h3>

      <div style={{ marginBottom: 10 }}>
        <label>
          VCF + TBI files (required):
          <input
            type="file"
            accept=".vcf.gz,.tbi"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
            required
          />
        </label>
        <div style={{ fontSize: 12, color: "#555" }}>
          Select both <code>.vcf.gz</code> and <code>.vcf.gz.tbi</code>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          Chromosome (optional):
          <input
            type="text"
            value={chr}
            onChange={(e) => setChr(e.target.value)}
            placeholder="chr1"
          />
        </label>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          Start (optional):
          <input
            type="number"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            placeholder="9234600"
          />
        </label>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          End (optional):
          <input
            type="number"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            placeholder="9234800"
          />
        </label>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Uploading & parsing..." : "Load and Plot"}
      </button>
    </form>
  );
}
