import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
import pysam
from typing import Optional
import base64

from .visuamitra_script import visuamitra_data_extract_stream

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

@router.post("/vcf-to-tsv-cursor")
async def vcf_to_tsv_cursor(
    vcf: UploadFile = File(...),
    tbi: UploadFile = File(...),
    last_cursor: Optional[str] = Form(None),
    page_size: int = Form(100),
    chr: Optional[str] = Form(None),
    start: Optional[int] = Form(None),
    end: Optional[int] = Form(None),
):
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

    # CURSOR
    cursor_chr, cursor_pos = (None, None)
    if last_cursor:
        cursor_chr, cursor_pos = decode_cursor(last_cursor)

    collected = []
    next_cursor = None
    seen_header = False
    count = 0

    # SAFE STREAMING (no errors possible now)
    for raw_line in visuamitra_data_extract_stream(vcf_path, chr, start, end):
        if isinstance(raw_line, bytes):
            raw_line = raw_line.decode("utf-8")

        if not raw_line.strip():
            continue

        if raw_line.startswith("Chrom") and not seen_header:
            collected.append(raw_line)
            seen_header = True
            continue

        parts = raw_line.split("\t")
        if len(parts) < 2:
            continue

        row_chr = parts[0]
        try:
            row_pos = int(parts[1])
        except:
            continue

        if cursor_chr and row_pos <= cursor_pos and row_chr == cursor_chr:
            continue

        if count >= page_size:
            next_cursor = encode_cursor(row_chr, row_pos)
            break

        collected.append(raw_line)
        count += 1

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