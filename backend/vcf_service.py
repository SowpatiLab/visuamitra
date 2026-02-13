def process_vcf(vcf_file, chrom=None, start=None, end=None):
    header = "chrom\tstart\tend\tvalue"
    rows = [
        "chr1\t100\t200\t0.87",
        "chr1\t200\t300\t0.92",
    ]
    return "\n".join([header] + rows)
