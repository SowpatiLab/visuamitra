import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
import pysam
from typing import Optional
import base64

from visuamitra_script import visuamitra_data_extract_stream

router = APIRouter(prefix="/api")

@router.post("/vcf-to-tsv-upload")
def vcf_to_tsv_upload(
    vcf: UploadFile = File(...),
    tbi: UploadFile = File(...),
    chr: str | None = Form(None),
    start: int | None = Form(None),
    end: int | None = Form(None),
):
    # Create temp directory
    tmpdir = tempfile.mkdtemp(prefix="vcf_")
    vcf_path = os.path.join(tmpdir, vcf.filename)
    tbi_path = os.path.join(tmpdir, tbi.filename)

    # Save uploads
    with open(vcf_path, "wb") as f:
        shutil.copyfileobj(vcf.file, f)
    with open(tbi_path, "wb") as f:
        shutil.copyfileobj(tbi.file, f)

    # Verify index corresponds to VCF
    if not tbi.filename.startswith(vcf.filename):
        raise HTTPException(status_code=400, detail="TBI index does not match VCF filename")
    
    try:
        tabix = pysam.TabixFile(vcf_path)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not open VCF or index")
    
    # Get contigs from VCF index
    contigs = list(tabix.contigs)

    # Function to check if any variant exists in a region
    def region_has_variants(contig, start0, end0):
        try:
            for _ in tabix.fetch(contig, start0, end0):
                return True
        except ValueError:
            return False
        return False

        # If chr provided at all: 
    if chr:        
            # Check if chromosome exists in index
        if chr not in tabix.contigs:
            raise HTTPException(status_code=400, detail=f"Chromosome '{chr}' not found in VCF")

        # Validate start/end ranges, including searching across all contigs if no chr
    if start is not None or end is not None:
        if start is not None and start < 1:
            raise HTTPException(status_code=400, detail="Start must be >= 1")
        if end is not None and end < 1:
            raise HTTPException(status_code=400, detail="End must be >= 1")
        if start is not None and end is not None and start > end:
            raise HTTPException(status_code=400, detail="Start must be < End")

        fetch_start = 0 if start is None else start - 1
        fetch_end = None if end is None else end

        # Case A: chr is specified
        if chr:
            # Check if region intersects actual data
            if not region_has_variants(chr, fetch_start, fetch_end):
                raise HTTPException(
                    status_code=400,
                    detail=f"No data found in range {start}-{end} on chromosome {chr}"
                )

        # Case B: no chr — search across all contigs
        else:
            found_any = False
            for contig in contigs:
                if region_has_variants(contig, fetch_start, fetch_end):
                    found_any = True
                    break
            if not found_any:
                raise HTTPException(
                    status_code=400,
                    detail=f"No data found in range {start}-{end} across all chromosomes"
                )

    # Generator for streaming TSV
    def byte_generator():
        for line in visuamitra_data_extract_stream(vcf_path, chr, start, end):
            if isinstance(line, str):
                yield line.encode("utf-8")
            else:
                yield line

    return StreamingResponse(
        byte_generator(),
        media_type="text/tab-separated-values",
        headers={"Content-Disposition": "attachment; filename=visuamitra.tsv"},
    )


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

@router.post("/vcf-to-tsv-cursor")
def vcf_to_tsv_cursor(
    vcf: UploadFile = File(...),
    tbi: UploadFile = File(...),
    last_cursor: Optional[str] = Form(None),
    page_size: int = Form(100),
    chr: Optional[str] = Form(None),
    start: Optional[int] = Form(None),
    end: Optional[int] = Form(None),
):
    # Save files to temp
    tmpdir = tempfile.mkdtemp(prefix="vcf_")
    vcf_path = f"{tmpdir}/{vcf.filename}"
    tbi_path = f"{tmpdir}/{tbi.filename}"
    with open(vcf_path, "wb") as f:
        shutil.copyfileobj(vcf.file, f)
    with open(tbi_path, "wb") as f:
        shutil.copyfileobj(tbi.file, f)

    # Decode last cursor if provided
    cursor_chr, cursor_pos = (None, None)
    if last_cursor:
        cursor_chr, cursor_pos = decode_cursor(last_cursor)

    collected = []
    next_cursor = None
    seen_header = False
    count = 0

    # Normalize region
    region_chr = chr
    region_start = start
    region_end = end

    # If no region is provided, this behaves like your existing logic
    # The extract_stream yields everything in order (chr, pos)

    for raw_line in visuamitra_data_extract_stream(vcf_path, region_chr, region_start, region_end):
        if isinstance(raw_line, bytes):
            raw_line = raw_line.decode("utf-8")

        if not raw_line.strip():
            continue

        # Always include header once
        if raw_line.startswith("Chrom") and not seen_header:
            collected.append(raw_line)
            seen_header = True
            continue

        parts = raw_line.strip().split("\t")
        if len(parts) < 2:
            continue

        row_chr = parts[0]
        try:
            row_pos = int(parts[1])
        except:
            continue

        # If we have a region filter, skip rows outside the region
        if region_chr and row_chr != region_chr:
            continue

        if region_start is not None and row_pos < region_start:
            continue

        if region_end is not None and row_pos > region_end:
            continue

        # If we have a cursor, skip until we reach cursor
        if cursor_chr and cursor_pos is not None:
            if (row_chr == cursor_chr and row_pos <= cursor_pos):
                continue

        # Check page limit
        if count >= page_size:
            next_cursor = encode_cursor(row_chr, row_pos)
            break

        # Otherwise include line
        collected.append(raw_line)
        count += 1

    def stream_rows():
        for row in collected:
            yield row

    headers = {}
    if next_cursor:
        headers["X-Next-Cursor"] = next_cursor
    print("Next cursor is:", next_cursor)

    return StreamingResponse(
        stream_rows(),
        media_type="text/tab-separated-values",
        headers=headers,
    )