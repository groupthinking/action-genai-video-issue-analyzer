# replicator.py
import json
import os
import sys
import vertexai
import traceback
from vertexai.generative_models import GenerativeModel, Part

# CONFIGURATION
PROJECT_ID = "uvai-730bb"

# --- 1. THE INPUT AGENT (Video Fetcher) ---
class VideoIngestAgent:
    def stream_audio_to_memory(self, video_url):
        print(f"📥 Cloud Ingest: Streaming audio to memory (No Disk I/O)...")
        import subprocess

        # yt-dlp to stdout (-)
        cmd = [
            'yt-dlp',
            '-x', # Extract audio
            '--audio-format', 'mp3', # mp3 is safer for streaming containers than m4a sometimes
            '-o', '-', # Output to stdout
            '--quiet', # Suppress progress bars to keep stdout clean
            '--no-warnings',
            video_url
        ]

        try:
            # Capture stdout as bytes
            process = subprocess.run(cmd, capture_output=True, check=True)
            audio_data = process.stdout
            print(f"✅ Buffered {len(audio_data) / 1024 / 1024:.2f} MB to memory.")
            return audio_data, "audio/mp3"
        except subprocess.CalledProcessError as e:
            traceback.print_exc()
            print(f"\n❌ Error: Stream failed. Check URL or network.")
            sys.exit(1)

# --- 2. THE SOLUTIONS ARCHITECT (Gemini 1.5 Pro Multimodal) ---
class SolutionsArchitectAgent:
    def __init__(self, project_id):
        print(f"☁️ Connecting to Google Vertex AI (Project: {project_id})...")
        vertexai.init(project=project_id, location="us-central1")
        self.model = GenerativeModel("gemini-2.0-flash")

    def analyze_and_reverse_engineer(self, audio_data, mime_type):
        print("🧠 Analyzing audio stream with Gemini 2.0 Flash (Multimodal)...")

        # Audio data is already bytes
        audio_part = Part.from_data(
            mime_type=mime_type,
            data=audio_data
        )

        prompt = """
        You are a Senior DevOps Engineer. You are listening to a technical tutorial audio stream.

        YOUR GOAL: Extract the exact steps to REPLICATE the result shown.

        1. IDENTIFY THE GOAL: What is being built?
        2. TECH STACK: List every tool, library, and API mentioned.
        3. ACCESS REQUIREMENTS: What API Keys, Logins, or Secrets are needed?
        4. EXECUTION PLAN: Step-by-step shell commands or Python code logic.

        OUTPUT JSON format only:
        {
            "goal": "Build a...",
            "required_tools": ["python", "docker", "api_key_x"],
            "missing_secrets": ["OPENAI_API_KEY", "AWS_SECRET"],
            "execution_steps": [
                {"step": 1, "cmd": "pip install x"},
                {"step": 2, "code": "import x..."}
            ]
        }
        """

        response = self.model.generate_content([audio_part, prompt])

        # Clean response
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text)

# --- 3. THE HUMAN BRIDGE (Verification) ---
class HumanLoopAgent:
    def verify_requirements(self, requirements):
        print("\n🛑 --- VERIFICATION REQUIRED ---")
        print(f"🎯 Target Goal: {requirements['goal']}")
        print(f"🛠  Detected Tools: {requirements['required_tools']}")

        missing = []
        for secret in requirements.get('missing_secrets', []):
            if secret not in os.environ:
                missing.append(secret)

        if missing:
            print(f"⚠️ MISSING KEYS: {missing}")
            print("Note: Ensure these are exported in your environment before running the solution.")

        return True

# --- 4. THE BUILDER (Dispatcher) ---
class BuilderAgent:
    def execute(self, steps):
        print("\n🚀 --- GENERATING SOLUTION ---")

        if os.path.exists("generated_solution.py"):
            os.remove("generated_solution.py")

        for step in steps:
            if "cmd" in step:
                print(f"💻 [CMD] {step['cmd']}")
            elif "code" in step:
                print(f"🐍 [CODE] Appending to generated_solution.py...")
                with open("generated_solution.py", "a") as f:
                    f.write(step['code'] + "\n")

        print("\n✅ DONE. File created: 'generated_solution.py'")

# --- MAIN REPLICATOR PIPELINE ---
def mirror_video_workflow(video_url, project_id):
    # 1. DOWNLOAD (Stream)
    ingest = VideoIngestAgent()
    audio_bytes, mime_type = ingest.stream_audio_to_memory(video_url)

    # 2. ANALYZE (Multimodal)
    architect = SolutionsArchitectAgent(project_id)
    blueprint = architect.analyze_and_reverse_engineer(audio_bytes, mime_type)

    # 3. VERIFY
    manager = HumanLoopAgent()
    approved = manager.verify_requirements(blueprint)

    # 4. EXECUTE
    if approved:
        builder = BuilderAgent()
        builder.execute(blueprint['execution_steps'])
    else:
        print("❌ Workflow aborted.")

if __name__ == "__main__":
    # Check for CLI Argument
    if len(sys.argv) > 1:
        VIDEO_URL = sys.argv[1]
    else:
        # Fallback to interactive input to avoid shell quoting issues
        print("🔗 Enter YouTube URL:")
        VIDEO_URL = input("> ").strip()

    if not VIDEO_URL:
        print("❌ Error: No URL provided.")
        sys.exit(1)
    mirror_video_workflow(VIDEO_URL, PROJECT_ID)
