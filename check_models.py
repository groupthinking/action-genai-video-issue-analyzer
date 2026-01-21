import vertexai
from vertexai.generative_models import GenerativeModel
import traceback

PROJECT_ID = "uvai-730bb"
LOCATION = "us-central1"

print(f"Checking models in {PROJECT_ID} @ {LOCATION}...")
vertexai.init(project=PROJECT_ID, location=LOCATION)

# List of potential models to check (including 2026-era logic)
candidates = [
    "gemini-1.5-flash-001",
    "gemini-1.5-pro-001",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash",
    "gemini-2.0-pro-exp",
    "gemini-pro",
    "gemini-1.0-pro"
]

for m in candidates:
    print(f"Testing {m}...", end=" ")
    try:
        model = GenerativeModel(m)
        # Quick test generation
        response = model.generate_content("test")
        print(f"✅ AVAILABLE (Response: {response.text.strip()[:10]}...)")
    except Exception as e:
        print(f"❌ FAILED")
        # print(f"  Error: {str(e)[:100]}...") # Uncomment for details
