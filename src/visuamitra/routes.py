import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
import pysam
from typing import Optional
import base64

from .visuamitra_script import visuamitra_data_extract_stream, extract_methcutoff

router = APIRouter()

def encode_cursor(chr, pos):
    raw = f"{chr}:{pos}"
    return base64.urlsafe_b64encode(raw.encode()).decode()

def decode_cursor(cursor):
    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        c, p = decoded.split(":")
        return c, int(p)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid cursor format")

# New - Samples Endpoint

@router.post("/get-vcf-metadata")
async def get_vcf_metadata(
    vcf: UploadFile = File(...),
):
    """Returns the list of samples and metadata description without streaming data."""
    tmpdir = tempfile.mkdtemp(prefix="vcf_meta_")
    vcf_path = os.path.join(tmpdir, vcf.filename)
    
    with open(vcf_path, "wb") as f:
        shutil.copyfileobj(vcf.file, f)
    
    try:
        cutoff_info, total_samples = extract_methcutoff(vcf_path)
        return {
            "meth_cutoff": cutoff_info,
            "samples": total_samples
        }
    finally:
        if os.path.exists(vcf_path):
            shutil.rmtree(tmpdir)

@router.post("/vcf-to-tsv-cursor")
async def vcf_to_tsv_cursor(
    vcf: UploadFile = File(...),
    tbi: UploadFile = File(...),
    last_cursor: Optional[str] = Form(None),
    page_size: int = Form(100),
    chr: Optional[str] = Form(None),
    start: Optional[int] = Form(None),
    end: Optional[int] = Form(None),
    samples: Optional[str] = Form(None),
):
    
    sample_indices = [0]
    if samples:
        try:
            sample_indices = [int(i) for i in samples.split(",")]
        except ValueError:
            raise HTTPException(status_code=400, detail="Samples must be comma-separated integers")


    tmpdir = tempfile.mkdtemp(prefix="vcf_")
    vcf_path = f"{tmpdir}/{vcf.filename}"
    tbi_path = f"{tmpdir}/{tbi.filename}"

    with open(vcf_path, "wb") as f:
        shutil.copyfileobj(vcf.file, f)
    with open(tbi_path, "wb") as f:
        shutil.copyfileobj(tbi.file, f)

    try:
        tabix = pysam.TabixFile(vcf_path)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not open VCF or index")

    contigs = set(tabix.contigs)

    # BASIC VALIDATION
    if chr and chr not in contigs:
        raise HTTPException(
            status_code=400,
            detail=f"Chromosome '{chr}' not found in VCF"
        )

    if start is not None and start < 1:
        raise HTTPException(status_code=400, detail="Start must be >= 1")
    if end is not None and end < 1:
        raise HTTPException(status_code=400, detail="End must be >= 1")
    if start is not None and end is not None and start > end:
        raise HTTPException(status_code=400, detail="Start must be <= End")

    fetch_start = 0 if start is None else start - 1
    fetch_end = end

    # CRITICAL PREFLIGHT CHECK
    try:
        if chr:
            # MUST run before streaming
            has_any = False
            for _ in tabix.fetch(chr, fetch_start, fetch_end):
                has_any = True
                break
            if not has_any:
                raise HTTPException(
                    status_code=404,
                    detail=f"No data found in range {start}-{end} on chromosome {chr}"
                )

        elif start is not None or end is not None:
            found = False
            for c in contigs:
                try:
                    for _ in tabix.fetch(c, fetch_start, fetch_end):
                        found = True
                        break
                except ValueError:
                    continue
                if found:
                    break

            if not found:
                raise HTTPException(
                    status_code=404,
                    detail=f"No data found in range {start}-{end} across all chromosomes"
                )

    except ValueError:
        # pysam throws this for invalid regions
        raise HTTPException(
            status_code=400,
            detail=f"Invalid genomic region: chr={chr}, start={start}, end={end}"
        )

   # --- 1. CURSOR & CONTIG SETUP ---
    cursor_chr, cursor_pos = (None, None)
    if last_cursor:
        cursor_chr, cursor_pos = decode_cursor(last_cursor)

    # Get a sorted list of chromosomes from the Tabix index
    all_contigs = sorted(list(tabix.contigs)) 

    # Determine starting chromosome and position
    # If no specific 'chr' is locked by the user, we use the cursor or start from the first contig
    start_chr = cursor_chr if cursor_chr else (chr if chr else all_contigs[0])
    start_pos = cursor_pos if cursor_pos is not None else start

    try:
        start_index = all_contigs.index(start_chr)
    except ValueError:
        start_index = 0

    collected = []
    next_cursor = None
    seen_header = False
    count = 0

    # --- 2. MULTI-CHROMOSOME STREAMING LOOP ---
    # This loop allows the code to "jump" to the next chromosome if the current one ends
    for i in range(start_index, len(all_contigs)):
        current_iter_chr = all_contigs[i]
        
        # Only use the specific 'start_pos' for the very first chromosome we check
        # For subsequent chromosomes, we start at coordinate 0
        iter_start = start_pos if current_iter_chr == start_chr else 0
        
        # If the user locked a specific 'chr', and we've finished it, stop looking at others
        if chr and current_iter_chr != chr:
            break

        # Call your extraction script for the current chromosome
        for raw_line in visuamitra_data_extract_stream(
            vcf_path, 
            chr=current_iter_chr, 
            start_coord=iter_start, 
            end_coord=None if last_cursor else end,
            samples_index=sample_indices
        ):
            if isinstance(raw_line, bytes):
                raw_line = raw_line.decode("utf-8")
            if not raw_line.strip():
                continue

            # Handle Metadata and Headers (only append once)
            if raw_line.startswith("##"):
                if not last_cursor: # Only add metadata on page 1
                    collected.append(raw_line)
                continue
            if raw_line.startswith("Chrom"):
                if not seen_header:
                    collected.append(raw_line)
                    seen_header = True
                continue

            parts = raw_line.split("\t")
            if len(parts) < 2: continue
            
            row_chr = parts[0]
            try:
                row_pos = int(parts[1])
            except:
                continue

            # Skip the specific record pointed to by the cursor to avoid duplicates
            if cursor_chr and row_pos <= cursor_pos and row_chr == cursor_chr:
                continue

            # If we've reached the page limit, set the cursor and STOP EVERYTHING
            if count >= page_size:
                next_cursor = encode_cursor(row_chr, row_pos)
                break

            collected.append(raw_line)
            count += 1

        # Break the outer chromosome loop if we have enough data for a page
        if next_cursor:
            break

    def stream_rows():
        for row in collected:
            yield row

    headers = {}
    if next_cursor:
        headers["X-Next-Cursor"] = next_cursor

    return StreamingResponse(
        stream_rows(),
        media_type="text/tab-separated-values",
        headers=headers,
    )