import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
import pysam

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


@router.post("/vcf-to-tsv-paged")
def vcf_to_tsv_paged(
    vcf: UploadFile = File(...),
    tbi: UploadFile = File(...),
    chr: str | None = Form(None),
    start: int = Form(0),
    limit: int = Form(100),
):
    tmpdir = tempfile.mkdtemp(prefix="vcf_")
    vcf_path = os.path.join(tmpdir, vcf.filename)
    tbi_path = os.path.join(tmpdir, tbi.filename)

    with open(vcf_path, "wb") as f:
        shutil.copyfileobj(vcf.file, f)
    with open(tbi_path, "wb") as f:
        shutil.copyfileobj(tbi.file, f)

    # Open VCF index
    try:
        tabix = pysam.TabixFile(vcf_path)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not open VCF or index")

    # Extract rows using visuamitra_data_extract_stream
    all_rows = list(visuamitra_data_extract_stream(vcf_path, chr))
    total_rows = len(all_rows)

    # Slice the requested page
    paged_rows = all_rows[start : start + limit]

    return {
        "rows": paged_rows,
        "start": start,
        "limit": limit,
        "total": total_rows,
    }

