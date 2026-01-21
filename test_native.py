import vertexai
from vertexai.generative_models import GenerativeModel, Part, Tool, GoogleSearchRetrieval
import sys

PROJECT_ID = "uvai-730bb"
LOCATION = "us-central1"
VIDEO_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw"

vertexai.init(project=PROJECT_ID, location=LOCATION)
model = GenerativeModel("gemini-2.0-flash")

print(f"🧪 Testing Cloud-Native Methods for: {VIDEO_URL}")

# METHOD 1: Direct URI (Usually GCS only, checking for 2026 public URL support)
print("\n--- Method 1: Direct Part.from_uri() ---")
try:
    # Attempting to pass YouTube URL as a URI
    part = Part.from_uri(uri=VIDEO_URL, mime_type="video/mp4")
    response = model.generate_content([part, "Describe this video."])
    print("✅ SUCCESS (Direct URI)")
    print(response.text)
except Exception as e:
    print(f"❌ FAILED (Direct URI): {str(e)[:100]}...")

# METHOD 2: Grounding (Google Search Retrieval)
print("\n--- Method 2: Grounding with Google Search ---")
try:
    tool = Tool.from_google_search_retrieval(GoogleSearchRetrieval())
    prompt = f"Analyze the video at {VIDEO_URL}. Describe what happens."
    response = model.generate_content(prompt, tools=[tool])
    print("✅ SUCCESS (Grounding)")
    print(response.text)
except Exception as e:
    print(f"❌ FAILED (Grounding): {str(e)[:100]}...")
