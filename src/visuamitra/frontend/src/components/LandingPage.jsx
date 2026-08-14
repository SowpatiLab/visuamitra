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
  page: { 
    minHeight: "100vh", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    background: "#f8fafc" 
  },
  container: { 
    textAlign: "center", 
    maxWidth: "56.25rem", // 900px
    width: "100%",
    padding: "0 1em"
  },
  logo: { 
    width: "7.5rem", // 120px
    marginBottom: "0.25em" // 4px
  },
  title: { 
    fontSize: "2.5rem", 
    color: "#1e293b", 
    margin: 0 
  },
  subtitle: { 
    color: "#64748b", 
    marginTop: "0.25em", // 4px
    marginBottom: "2.5em" // 40px
  },
  cardGrid: { 
    display: "flex", 
    gap: "1.875em", // 30px
    justifyContent: "center", 
    padding: "1.25em", // 20px
    flexWrap: "wrap"
  },
  card: { 
    flex: "1 1 17.5em", // Min-width for responsiveness
    padding: "1.875em", // 30px
    background: "#fff", 
    borderRadius: "1em", // 16px
    boxShadow: "0 0.625em 1.5625em rgba(0,0,0,0.05)", 
    cursor: "pointer", 
    transition: "transform 0.2s, box-shadow 0.2s",
    border: "0.0625em solid #e2e8f0" // 1px
  },
  cardCLI: { 
    flex: "1 1 17.5em", 
    padding: "1.875em", // 30px
    background: "#f1f5f9", 
    borderRadius: "1em", // 16px
    border: "0.125em dashed #cbd5e1", // 2px
    textAlign: "left"
  },
  icon: { 
    fontSize: "2.5rem", // 40px
    marginBottom: "0.9375em" // 15px
  },
  cardTitle: { 
    margin: "0 0 0.625em 0", // 10px
    color: "#334155" 
  },
  cardText: { 
    fontSize: "0.875rem", // 14px
    color: "#64748b", 
    lineHeight: "1.5" 
  },
  cardBtn: { 
    marginTop: "1.25em", // 20px
    padding: "0.625em 1.25em", // 10px 20px
    borderRadius: "0.5em", // 8px
    border: "none", 
    background: "#328547", 
    color: "#fff", 
    fontWeight: "600", 
    cursor: "pointer" 
  },
  code: { 
    display: "block", 
    background: "#1e293b", 
    color: "#f8fafc", 
    padding: "0.625em", // 10px
    borderRadius: "0.375em", // 6px
    fontSize: "0.75rem", // 12px
    marginTop: "0.9375em" // 15px
  },
  hint: { 
    fontSize: "0.6875rem", // 11px
    color: "#94a3b8", 
    marginTop: "0.625em" // 10px
  }
};