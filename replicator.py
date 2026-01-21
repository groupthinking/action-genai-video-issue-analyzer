# replicator.py
import json
import os
import re
import sys
import traceback
import vertexai
from vertexai.generative_models import GenerativeModel, Part, Tool
from vertexai.generative_models import grounding

# CONFIGURATION
PROJECT_ID = "uvai-730bb"

def sanitize_url(url):
    """
    Converts various YouTube URL formats to a canonical clean version
    to improve Search Grounding performance.
    """
    url = url.strip()
    # Handle youtu.be shortlinks
    if "youtu.be/" in url:
        video_id = url.split("youtu.be/")[1].split("?")[0]
        return f"https://www.youtube.com/watch?v={video_id}"

    # Handle standard links with extra params
    if "youtube.com/watch" in url:
        try:
            # Extract v=ID
            if "v=" in url:
                video_id = url.split("v=")[1].split("&")[0]
                return f"https://www.youtube.com/watch?v={video_id}"
        except:
            pass

    return url

# --- 1. THE INPUT AGENT (Deprecated - Native Cloud Support) ---
# VideoIngestAgent removed. Gemini accesses URI directly.

# --- 2. THE SOLUTIONS ARCHITECT (Gemini 2.0 Flash Multimodal) ---
class SolutionsArchitectAgent:
    def __init__(self, project_id):
        print(f"☁️ Connecting to Google Vertex AI (Project: {project_id})...")
        vertexai.init(project=project_id, location="us-central1")
        self.model = GenerativeModel("gemini-2.0-flash")

    def analyze_and_reverse_engineer(self, video_url):
        print(f"🧠 Analysis via Google Search Grounding (Gemini 2.0 Flash)...")

        # Configure Grounding Tool (Validated Bypass)
        # Using raw dict construction to ensure compatibility with Gemini 2.0
        gsr_tool = Tool.from_dict({"google_search": {}})

        prompt = f"""
        You are a Senior DevOps Engineer.
        SEARCH for the video URL: {video_url}

        Your task is to analyze the technical content associated with this video (transcript, description, discussions).

        YOUR GOAL: Extract the exact steps to REPLICATE the result shown.

        1. IDENTIFY THE GOAL: What is being built?
        2. TECH STACK: List every tool, library, and API mentioned.
        3. EXECUTION PLAN: Step-by-step shell commands or Python code logic.

        OUTPUT JSON format only:
        {{
            "goal": "Build a...",
            "required_tools": ["python", "docker"],
            "missing_secrets": ["API_KEY"],
            "execution_steps": [
                {{"step": 1, "cmd": "pip install x"}},
                {{"step": 2, "code": "import x..."}}
            ]
        }}
        """

        # Generation Config (Standard)
        # JSON Mode is incompatible with Search Tool, so we rely on prompt instructions.
        generation_config = {
            "temperature": 0.4
        }

        try:
            response = self.model.generate_content(
                prompt, # Prompts for search
                tools=[gsr_tool], # Enable grounding
                generation_config=generation_config
            )

            # debug log
            try:
                grounding_len = len(response.candidates[0].grounding_metadata.search_entry_point.rendered_content)
                print(f"🔍 Grounding Source: {grounding_len} chars")
            except:
                print("🔍 Grounding Source: None")

            # Safe extraction
            try:
                candidate = response.candidates[0]
                # print(f"🔍 Finish Reason: {candidate.finish_reason}")

                parts_text = []
                for part in candidate.content.parts:
                    if part.text:
                        parts_text.append(part.text)
                text = "\n".join(parts_text)

            except Exception as e:
                print(f"❌ Text extraction failed: {e}")
                text = ""

            try:
                return extract_json(text)
            except Exception as e:
                print(f"⚠️ JSON Parse Failed: {e}")
                print(f"RAW RESP: {text}") # Print FULL text to debug
                return None

        except Exception as e:
            traceback.print_exc()
            print(f"\n❌ Grounding Analysis Failed.")
            return None

# Helper for robust JSON extraction
def extract_json(text):
    text = text.strip()
    # Strip markdown code blocks
    if text.startswith("```"):
        # Find first newline
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline+1:]
        # Strip closing backticks
        if text.endswith("```"):
            text = text[:-3]

    # Find outer brackets if still not clean
    text = text.strip()
    start_idx = text.find("{")
    end_idx = text.rfind("}")

    if start_idx != -1 and end_idx != -1:
        text = text[start_idx:end_idx+1]

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

        # Create file at start to ensure it exists
        with open("generated_solution.py", "w") as f:
            f.write("# Generated Solution\n\n")

        for step in steps:
            if "cmd" in step:
                print(f"💻 [CMD] {step['cmd']}")
                with open("generated_solution.py", "a") as f:
                    f.write(f"# CMD: {step['cmd']}\n")
            elif "code" in step:
                print(f"🐍 [CODE] Appending to generated_solution.py...")
                with open("generated_solution.py", "a") as f:
                    f.write(step['code'] + "\n")

        print("\n✅ DONE. File created: 'generated_solution.py'")

# --- MAIN REPLICATOR PIPELINE ---
def mirror_video_workflow(video_url, project_id):
    # 1. ANALYZE (Direct Native Cloud URI)
    architect = SolutionsArchitectAgent(project_id)
    blueprint = architect.analyze_and_reverse_engineer(video_url)

    if not blueprint:
        print("❌ Analysis failed (Model returned None). Exiting.")
        return

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

    VIDEO_URL = sanitize_url(VIDEO_URL)
    print(f"🔗 Analysis Target: {VIDEO_URL}")
    mirror_video_workflow(VIDEO_URL, PROJECT_ID)
