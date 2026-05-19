
//Reads first few bytes of a browser file blob
async function getFileMagicBytes(file, numBytes = 4) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target.result) return resolve("");
      const arr = new Uint8Array(e.target.result);
      const hex = Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      resolve(hex);
    };
    reader.onerror = () => resolve("");
    reader.readAsArrayBuffer(file.slice(0, numBytes));
  });
}


 // Validates selected file listings from browser input
export function validateSelectedFiles(filesArray) {
  if (!filesArray || filesArray.length === 0) {
    return { isValid: false, errorMsg: "No files selected.", vcf: null, tbi: null };
  }

  const vcfFiles = filesArray.filter(f => f.name.toLowerCase().endsWith(".vcf.gz") || f.name.toLowerCase().endsWith(".vcf"));
  const tbiFiles = filesArray.filter(f => f.name.toLowerCase().endsWith(".tbi"));

  if (vcfFiles.length > 1 && tbiFiles.length === 0) {
    return {
      isValid: false,
      errorMsg: "Multiple dataset files selected without an index. Please select exactly one '.vcf.gz' and its matching '.tbi' file.",
      vcf: null, tbi: null
    };
  }

  if (vcfFiles.length === 1 && tbiFiles.length === 0) {
    const vcf = vcfFiles[0];
    return {
      isValid: false,
      errorMsg: `Incorrect files selected. Please select a matching .tbi index file for the selected VCF (${vcf.name}).`,
      vcf: null, tbi: null
    };
  }

  if (tbiFiles.length === 1 && vcfFiles.length === 0) {
    const tbi = tbiFiles[0];
    return {
      isValid: false,
      errorMsg: `Incorrect files selected. Please select a matching .vcf.gz dataset file for the selected TBI (${tbi.name}).`,
      vcf: null, tbi: null
    };
  }

  const targetVcf = filesArray.find((f) => f.name.toLowerCase().endsWith(".vcf.gz"));
  const expectedTbiName = targetVcf ? `${targetVcf.name}.tbi` : "";
  const targetTbi = filesArray.find((f) => f.name === expectedTbiName);

  if (!targetVcf) {
    return {
      isValid: false,
      errorMsg: "Invalid file types selected. Please select a valid '.vcf.gz' and '.tbi' pair.",
      vcf: null, tbi: null
    };
  }

  if (!targetTbi) {
    return {
      isValid: true, 
      errorMsg: `Index file not found. Expected "${expectedTbiName}" in the same folder.`,
      vcf: targetVcf,
      tbi: null
    };
  }

  return { isValid: true, errorMsg: "", vcf: targetVcf, tbi: targetTbi };
}


 // Perform frontend deep validation checks before triggering backend requests
 // Safely handles both local paths (CLI mode) and file blobs (Browser mode)

export async function validateSubmission({ vcfFile, tbiFile, isCLI }) {
  if (!vcfFile || !tbiFile) {
    return { isValid: false, errorMsg: "Incomplete target selection. Both a dataset and index component are required." };
  }

  // Extract names cleanly- whether it's an object with a path string or a true File instance
  const vcfName = vcfFile.name.toLowerCase();
  const tbiName = tbiFile.name.toLowerCase();

  // Determine if we are handling local CLI files or browser uploads
  const isLocalFile = isCLI || vcfFile.isLocal || tbiFile.isLocal;

  // BRANCH 1: CLI VALIDATION
  if (isLocalFile) {
    // Basic path text validation
    if (vcfName.endsWith(".vcf") && !vcfName.endsWith(".gz")) {
      return {
        isValid: false,
        errorMsg: `Uncompressed local VCF path targeted. Tabix engine requires block-zipped files ending in '.vcf.gz'.`
      };
    }

    if (!tbiName.endsWith(".tbi")) {
      return {
        isValid: false,
        errorMsg: "The targeted local index system path must resolve to a valid '.tbi' file extension."
      };
    }

    // Local name matching verification (handles both Linux '/' and Windows '\\' paths)
    const baseVcfPathName = vcfName.split(/[/\\]/).pop().replace(".gz", "").replace(".vcf", "");
    const baseTbiPathName = tbiName.split(/[/\\]/).pop().replace(".tbi", "").replace(".gz", "").replace(".vcf", "");

    if (baseVcfPathName !== baseTbiPathName) {
      return {
        isValid: false,
        errorMsg: `Local path filename mismatch! Your index path filename (${tbiName.split(/[/\\]/).pop()}) does not match your tracking dataset filename (${vcfName.split(/[/\\]/).pop()}).`
      };
    }

    // Return valid! FastAPI handles checking if local file exists on disk
    return { isValid: true, errorMsg: "" };
  }

  // BROWSER UPLOAD VALIDATION
  if (vcfName.endsWith(".vcf") && !vcfName.endsWith(".gz")) {
    return {
      isValid: false,
      errorMsg: `Uncompressed VCF detected (${vcfFile.name}). Tabix indexing requires block-gzip compressed VCFs ending in '.vcf.gz'. Please compress your file using bgzip.`
    };
  }

  const baseVcfName = vcfName.split(/[/\\]/).pop().replace(".gz", "").replace(".vcf", "");
  const baseTbiName = tbiName.split(/[/\\]/).pop().replace(".tbi", "").replace(".gz", "").replace(".vcf", "");

  if (baseVcfName !== baseTbiName) {
    return {
      isValid: false,
      errorMsg: `File name mismatch! The index file '${tbiFile.name.split(/[/\\]/).pop()}' does not match your sequence tracking dataset file '${vcfFile.name.split(/[/\\]/).pop()}'.`
    };
  }

  // Structural checks passed! (Magic bytes evaluation bypassed to prevent reader false-positives)
  return { isValid: true, errorMsg: "" };
}