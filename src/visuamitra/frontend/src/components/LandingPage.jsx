import React from "react";
import { useNavigate } from "react-router-dom";
import favicon from '../assets/favicon.png';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <img src={favicon} alt="Logo" style={styles.logo} />
        <p style={styles.subtitle}>Visualize Motifs & Methylation across Tandem Repeat Alleles</p>
        
        <div style={styles.cardGrid}>
          {/* Browser Mode */}
          <div style={styles.card} onClick={() => navigate("/upload")}>
            <div style={styles.icon}>🌐</div>
            <h3 style={styles.cardTitle}>Browser Mode</h3>
            <p style={styles.cardText}>
              Select VCF and TBI files manually from your local machine to begin.
            </p>
            <button style={styles.cardBtn}>Launch Browser</button>
          </div>

          {/* CLI Mode */}
          <div style={styles.cardCLI}>
            <div style={styles.icon}>💻</div>
            <h3 style={styles.cardTitle}>Command Line Mode</h3>
            <p style={styles.cardText}>
              Launch directly from your terminal to bypass manual uploads:
            </p>
            <code style={styles.code}>visuamitra path/to/data.vcf</code>
            <p style={styles.hint}>Note: .tbi must be in the same folder.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" },
  container: { textAlign: "center", maxWidth: "900px", width: "100%" },
  logo: { width: "120px", marginBottom: "4px" },
  title: { fontSize: "2.5rem", color: "#1e293b", margin: 0 },
  subtitle: { color: "#64748b", marginTop:"4px", marginBottom: "40px" },
  cardGrid: { display: "flex", gap: "30px", justifyContent: "center", padding: "20px" },
  card: { 
    flex: 1, padding: "30px", background: "#fff", borderRadius: "16px", 
    boxShadow: "0 10px 25px rgba(0,0,0,0.05)", cursor: "pointer", transition: "transform 0.2s",
    border: "1px solid #e2e8f0"
  },
  cardCLI: { 
    flex: 1, padding: "30px", background: "#f1f5f9", borderRadius: "16px", 
    border: "2px dashed #cbd5e1", textAlign: "left"
  },
  icon: { fontSize: "40px", marginBottom: "15px" },
  cardTitle: { margin: "0 0 10px 0", color: "#334155" },
  cardText: { fontSize: "14px", color: "#64748b", lineHeight: "1.5" },
  cardBtn: { marginTop: "20px", padding: "10px 20px", borderRadius: "8px", border: "none", background: "#328547", color: "#fff", fontWeight: "600", cursor: "pointer" },
  code: { display: "block", background: "#1e293b", color: "#f8fafc", padding: "10px", borderRadius: "6px", fontSize: "12px", marginTop: "15px" },
  hint: { fontSize: "11px", color: "#94a3b8", marginTop: "10px" }
};