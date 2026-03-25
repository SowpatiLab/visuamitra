import requests

BASE_URL = "http://127.0.0.1:8088/api"
VCF_PATH = "/home/siddharth/Downloads/merged_tamatr_fmr1_2samples.vcf.gz"
TBI_PATH = "/home/siddharth/Downloads/merged_tamatr_fmr1_2samples.vcf.gz.tbi"

def test_metadata():
    print("--- Testing Metadata Discovery ---")
    with open(VCF_PATH, "rb") as vcf:
        r = requests.post(f"{BASE_URL}/get-vcf-metadata", files={"vcf": vcf})
    if r.status_code == 200:
        data = r.json()
        samples = data.get("samples", [])
        print(f"✅ Success! Response: {data}")
        print(f"📊 Total Samples Found: {len(samples)}")
        for i, name in enumerate(samples):
            print(f"   [{i}] {name}")
    else:
        print(f"❌ Failed: {r.status_code} - {r.text}")
        
def test_stream():
    print("\n--- Testing Multi-Sample Stream (Samples 0 and 1) ---")
    with open(VCF_PATH, "rb") as vcf, open(TBI_PATH, "rb") as tbi:
        data = {
            "samples": "0,1", # Requesting two samples
            "page_size": "2"
        }
        files = {"vcf": vcf, "tbi": tbi}
        r = requests.post(f"{BASE_URL}/vcf-to-tsv-cursor", files=files, data=data)
    
    print(f"Status: {r.status_code}")
    print("Output Preview (First 500 chars):")
    print(r.text[:500])

if __name__ == "__main__":
    test_metadata()
    test_stream()