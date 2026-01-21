# replicator.py
import json
import os
import sys
import vertexai
from vertexai.generative_models import GenerativeModel, Part

# CONFIGURATION
PROJECT_ID = "uvai-730bb"

# --- 1. THE INPUT AGENT (Video Fetcher) ---
class VideoIngestAgent:
    def download_audio(self, video_url):
        print(f"📥 Cloud Ingest: Buffering audio from stream...")
        output_filename = "temp_audio"
        # Force overwrite (-y), extract audio (-x), format m4a
        cmd = f'yt-dlp -x --audio-format m4a --force-overwrite -o "{output_filename}.%(ext)s" {video_url}'

        try:
            exit_code = os.system(cmd)
            if exit_code != 0:
                print("❌ Error: Audio ingest failed. Check the URL.")
                sys.exit(1)
        except Exception as e:
            traceback.print_exc()
            print(f"\n❌ Error: Audio ingest failed due to an unexpected error: {str(e)}")
            sys.exit(1)

        return f"{output_filename}.m4a"

# --- 2. THE SOLUTIONS ARCHITECT (Gemini 1.5 Pro Multimodal) ---
class SolutionsArchitectAgent:
    def __init__(self, project_id):
        print(f"☁️ Connecting to Google Vertex AI (Project: {project_id})...")
        vertexai.init(project=project_id, location="us-central1")
        self.model = GenerativeModel("gemini-1.5-flash-001")

    def analyze_and_reverse_engineer(self, audio_path):
        print("🧠 Analyzing audio stream with Gemini 1.5 Pro (Multimodal)...")

        with open(audio_path, "rb") as f:
            audio_data = f.read()

        audio_part = Part.from_data(
            mime_type="audio/mp4",
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
    # 1. DOWNLOAD
    ingest = VideoIngestAgent()
    audio_file = ingest.download_audio(video_url)

    # 2. ANALYZE (Multimodal)
    architect = SolutionsArchitectAgent(project_id)
    blueprint = architect.analyze_and_reverse_engineer(audio_file)

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
    if len(sys.argv) < 2:
        print("❌ Usage: python replicator.py <YOUTUBE_URL>")
        sys.exit(1)

    VIDEO_URL = sys.argv[1]
    mirror_video_workflow(VIDEO_URL, PROJECT_ID)
