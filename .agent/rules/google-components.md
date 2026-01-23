# Google & Claude API Reference for UVAI Platform

## API Keys (Project: uvai-730bb)

```bash
# YouTube Data API
YOUTUBE_API_KEY=API    

# Gemini API (for direct Gemini calls)
GEMINI_API_KEY=API

# Firebase API
FIREBASE_API_KEY=API

# Unrestricted Master (use when other keys have permission issues)
GOOGLE_API_KEY=API

---

## 1. Google Video Intelligence API

**URL:** https://docs.cloud.google.com/video-intelligence/docs/reference/rest

**Key Capability:** Analyze video content via URL without downloading

**Endpoint:**

```
POST /v1/videos:annotate
Service: videointelligence.googleapis.com
```

**Use Case for UVAI:**

- Label detection (identify what's in the video)
- Shot change detection (find scene transitions)
- Text detection (extract on-screen text/code)
- Object tracking (follow UI elements)

**How to Apply:**
Instead of downloading video, send video URL to this API for analysis.

---

## 2. Gemini Robotics-ER 1.5 (Agentic Capabilities)

**URL:** https://ai.google.dev/gemini-api/docs/robotics-overview

**Key Capability:** Orchestration and trajectory planning from images/video

**Model:** `gemini-robotics-er-1.5-preview`

**Agentic Features:**

- **Pointing to objects** - Identify locations in images
- **Trajectory planning** - Generate step sequences
- **Orchestration** - Higher-level spatial reasoning
- **Object detection** - Bounding boxes and tracking

**Python Example:**

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-robotics-er-1.5-preview",
    contents=[
        types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg'),
        "Place points for the trajectory of moving object A to location B"
    ],
    config=types.GenerateContentConfig(temperature=0.5)
)
```

**How to Apply:**
Use for frame-by-frame analysis of video tutorials to extract UI interaction sequences.

---

## 3. GoogleCloudPlatform/generative-ai Repository

**URL:** https://github.com/GoogleCloudPlatform/generative-ai

**Structure:**

```
gemini/          # Gemini samples
search/          # Vertex AI Search
rag-grounding/   # RAG and grounding samples
vision/          # Image generation/editing/captioning
audio/           # Audio processing
setup-env/       # Environment setup guides
```

**Related Repos:**

- `google-gemini/cookbook` - Gemini API cookbook
- `firebase/genkit` - Firebase AI samples

**How to Apply:**
Reference implementations for Gemini + Vision + Audio integration patterns.

---

## 4. Google API Gateway

**URL:** https://docs.cloud.google.com/api-gateway/docs/about-api-gateway

**Key Capability:** Unified REST API frontend for multiple backends

**Benefits:**

- Secure access to Cloud Run services
- Traffic management and rate limiting
- API versioning without backend changes
- Monitoring and logging built-in

**How to Apply:**
Front the UVAI video analysis endpoints with API Gateway for:

- Rate limiting per API key
- Authentication via Firebase Auth
- Unified `/v1/analyze` endpoint routing to different Cloud Run services

---

## 5. Claude Skills Best Practices

**URL:** https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

**Core Principles:**

1. **Concise is key** - Only add context Claude doesn't already have
2. **Progressive disclosure** - Load detailed files only when needed
3. **Feedback loops** - Implement verification steps
4. **Checklists for workflows** - Track multi-step progress

**Workflow Pattern:**

```markdown
Copy this checklist and track progress:

- [ ] Step 1: Analyze input
- [ ] Step 2: Validate assumptions
- [ ] Step 3: Execute core logic
- [ ] Step 4: Verify output
- [ ] Step 5: Return results
```

**How to Apply:**
UVAI agents should use checklist patterns for video processing pipeline steps.

---

## 6. Claude Vision API

**URL:** https://platform.claude.com/docs/en/build-with-claude/vision

**Key Capability:** Multimodal image/frame analysis

**Usage Methods:**

- `claude.ai` - Direct upload
- Console Workbench - Image blocks in prompts
- API request - Base64 or URL

**How to Apply:**
For videos, extract key frames and send to Claude Vision for:

- Code screenshot analysis
- UI element identification
- Tutorial step extraction

---

## 7. Claude Cookbook Highlights

**URL:** https://platform.claude.com/cookbooks

**Relevant Patterns:**

- **Programmatic tool calling (PTC)** - Reduce latency
- **Tool search with embeddings** - Scale to many tools
- **Automatic context compaction** - Manage long workflows
- **Crop tool for image analysis** - Zoom into regions
- **Multi-agent chief of staff** - Subagent orchestration

**How to Apply:**
Implement PTC for the agent chain (VTTA → CSDAA → OFSA) to reduce round-trips.

---

## 8. Migrate Google AI Studio to Vertex AI

**URL:** https://docs.cloud.google.com/vertex-ai/generative-ai/docs/migrate/migrate-google-ai

**Key Difference:**
| Feature | Google AI (Gemini API) | Vertex AI |
|---------|------------------------|-----------|
| Endpoint | `generativelanguage.googleapis.com` | `aiplatform.googleapis.com` |
| Auth | API Key or OAuth | Service Account or IAM |
| Client | Firebase AI Logic | Vertex AI SDK |

**Migration Steps:**

1. Create/use Google Cloud project
2. Migrate prompts to Vertex AI Studio
3. Upload training data if applicable
4. Delete unused API keys

**How to Apply:**
UVAI can use either, but for Cloud Run production, prefer Vertex AI for service account auth.

---

## Summary: Which API for What

| Task                      | API to Use                 |
| ------------------------- | -------------------------- |
| Video content analysis    | Video Intelligence API     |
| Frame trajectory/planning | Gemini Robotics-ER 1.5     |
| Code screenshot analysis  | Claude Vision              |
| Multi-agent orchestration | Claude Skills + SDK        |
| API management            | Google API Gateway         |
| Production deployment     | Vertex AI (not Gemini API) |
