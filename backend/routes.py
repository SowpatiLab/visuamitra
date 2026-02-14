import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse

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
    # Create a temp directory
    tmpdir = tempfile.mkdtemp(prefix="vcf_")

    vcf_path = os.path.join(tmpdir, vcf.filename)
    tbi_path = os.path.join(tmpdir, tbi.filename)

    # Save uploaded files
    with open(vcf_path, "wb") as f:
        shutil.copyfileobj(vcf.file, f)

    with open(tbi_path, "wb") as f:
        shutil.copyfileobj(tbi.file, f)

    # Validate index pairing
    if not tbi.filename.startswith(vcf.filename):
        raise HTTPException(
            status_code=400,
            detail="TBI index does not match VCF filename"
        )

    # TSV byte stream
    def byte_generator():
        for line in visuamitra_data_extract_stream(
            vcf_path, chr, start, end
        ):
            if isinstance(line, str):
                yield line.encode("utf-8")
            else:
                yield line

    return StreamingResponse(
        byte_generator(),
        media_type="text/tab-separated-values",
        headers={
            "Content-Disposition": "attachment; filename=visuamitra.tsv"
        },
    )
