# GitHub Action Video Issue Analyzer

[![Analyze with GenAI](https://img.shields.io/badge/Analyze_with-GenAI-blue?style=for-the-badge&logo=google-gemini)](https://github.com/groupthinking/action-genai-video-issue-analyzer)
[![Deploy Status](https://img.shields.io/badge/uvai.io-Live-22c55e?style=for-the-badge)](https://uvai.io)

This GitHub Action runs all video assets in an issue body through a LLM model to analyze the content, or can analyze a direct video URL when triggered via workflow_dispatch.
The default behavior is to summarize and extract task items but this can be customized through the `instructions` input.

The action outputs the analysis results to the GitHub Step Summary for easy viewing in the Actions tab.

---

## Tech Stack & Architecture

### Mechanism (Infrastructure & Tools)

| Category                | Technology            | Notes/Version                                      |
| ----------------------- | --------------------- | -------------------------------------------------- |
| **Framework**           | Next.js               | v16.1.2 with App Router + Turbopack                |
| **Language (Frontend)** | TypeScript            | v5.9.3, strict mode enabled                        |
| **Language (Backend)**  | JavaScript/TypeScript | Node.js LTS Alpine                                 |
| **UI Library**          | React                 | v19.2.3                                            |
| **CSS Implementation**  | Tailwind CSS          | v4.1.18 + PostCSS + Autoprefixer                   |
| **AI/LLM Primary**      | Google Gemini         | v0.24.1 (@google/generative-ai) - Gemini 2.0 Flash |
| **AI/LLM Framework**    | GenAIScript           | v2.3.13 - Core orchestration engine                |
| **Transcription**       | Whisper ASR           | Docker sidecar (openai-whisper-asr-webservice)     |
| **Video Processing**    | FFmpeg                | Installed in Docker container for frame extraction |
| **Edge Deployment**     | Cloudflare Workers    | Deployed to uvai.io via Wrangler                   |
| **Static Hosting**      | Cloudflare Pages      | Next.js static export for production               |
| **Container Runtime**   | Docker                | node:lts-alpine base image                         |
| **Package Manager**     | npm                   | Lock file present                                  |
| **CI/CD Platform**      | GitHub Actions        | Multi-workflow: CI + Video Analyzer                |
| **Version Control**     | Git/GitHub            | GitHub Agentics workflows enabled                  |
| **Build Tool**          | Turbopack             | Next.js dev mode                                   |
| **Code Quality**        | Prettier              | Script linting for genaisrc/ and src/              |
| **Testing Framework**   | Vitest + Playwright   | Unit tests (Vitest) + E2E tests (Playwright)       |
| **Logging**             | Winston               | Structured logging with multiple transports        |
| **Message Queue**       | RabbitMQ              | Async processing for external API calls            |
| **Secrets Management**  | AWS Secrets Manager   | Secure credential storage with env fallback        |

### Intent (Logic & Architecture)

- **Core Domain**: **Video-to-Agentic Action Execution** — The system transforms video content (YouTube URLs, direct video files, GitHub issue attachments) into structured, executable intelligence: code artifacts, deployment workflows, and actionable business insights.

- **Architecture Pattern**: **Multi-Surface Delivery** — Single core AI logic (GenAIScript) serves three surfaces:
  1. **GitHub Action** (Docker container) for CI/CD integration
  2. **Next.js Frontend** (uvai.io) for user-facing web interface
  3. **Cloudflare Workers API** for REST endpoints and landing page

- **Data Flow Direction**:

  ```text
  Video Input → GenAIScript/Gemini Analysis → AgenticOutput Schema → Multi-Format Delivery
       ↓                    ↓                        ↓
  (YouTube/MP4)    (Transcription + Frames)   (JSON/Markdown/UI)
  ```

- **Critical Data Path**:
  1. Video URL/file ingestion
  2. Whisper transcription (via Docker sidecar or Gemini native)
  3. FFmpeg frame extraction
  4. Gemini 2.0 Flash analysis with AgenticOutput schema enforcement
  5. Structured output: Summary, Endpoints, Capabilities, Workflows, Code Artifacts

- **Authentication**: GitHub Token-based (for issue access and asset resolution); Google API Key (for Gemini); Cloudflare secrets (for Worker deployment)

- **User Roles/Actors**:
  - **Developers** — Use GitHub Action for automated video analysis on issues
  - **End Users** — Use uvai.io web interface for direct YouTube analysis
  - **API Consumers** — Use REST endpoints for programmatic access

- **Key Entities**:
  - `AgenticOutput` — Core schema defining structured AI output (summary, extractedEndpoints, extractedCapabilities, actionableInsights, generatedWorkflow, codeArtifacts, perceivedLearnings)
  - `VideoInput` — React component for URL input validation
  - `AnalysisResults` — React component for rendering structured output

- **External Integrations**:
  - Google Gemini API (primary AI model)
  - YouTube (video download via yt-dlp)
  - GitHub Issues API (asset resolution)
  - Whisper ASR API (transcription fallback)

- **Communication Style**:
  - **GitHub Action** — Event-driven (issue opened/edited, workflow_dispatch)
  - **API** — REST (POST /api/analyze, POST /api/analyze/youtube)
  - **Frontend** — Client-side fetch to API route

---

## 🔥 NEW: Digital Refinery Pipeline

The core video analysis has been refactored into a **zero-disk, API-first architecture**:

```text
YouTube URL → INGEST → ENHANCE → Structured Output
                ↓          ↓
        (GCS Storage)  (Vertex AI Gemini)
```

### Pipeline Stages

| Stage       | Description                                            | Duration |
| ----------- | ------------------------------------------------------ | -------- |
| **INGEST**  | Zero-disk stream from YouTube to GCS via yt-dlp        | ~2-5s    |
| **ENHANCE** | Multimodal video analysis via Vertex AI Gemini 2.0     | ~10-15s  |
| **SEGMENT** | _(Optional)_ Key moments are extracted in ENHANCE pass | -        |
| **ACTION**  | _(Planned)_ pgvector storage for RAG queries           | -        |

### Key Principles

- **🚫 NO DOWNLOADING** — Videos stream directly from YouTube to GCS, then Vertex AI reads from GCS directly
- **Zero-Disk** — No temporary files, works on memory-constrained Cloud Run
- **API-First** — Uses official Google APIs (YouTube Data API, Vertex AI) instead of scraping
- **Single-Pass Analysis** — Mega-prompt extracts summary, tech stack, steps, code, and key moments in one request

### Test the Pipeline

```bash
# Run the integration test
GCS_BUCKET_NAME=your-bucket npm run test:pipeline
```

See [`docs/pipeline-test-results.md`](docs/pipeline-test-results.md) for latest test results.

## Project Structure

```text
action-genai-video-issue-analyzer/
├── genaisrc/                          # GenAIScript core logic
│   ├── action-video-issue-analyzer.genai.mts  # Main analyzer script
│   ├── architectural_context.md       # Agent deployment context
│   └── import-github-workspace.genai.mts
├── src/                               # Next.js frontend
│   ├── app/
│   │   ├── api/analyze/route.ts       # API route for video analysis
│   │   ├── layout.tsx                 # Root layout with SEO metadata
│   │   ├── page.tsx                   # Main UI page
│   │   └── globals.css                # Glass morphism design system
│   ├── components/
│   │   ├── VideoInput.tsx             # URL input with validation
│   │   └── AnalysisResults.tsx        # Structured output renderer
│   └── lib/
│       └── gemini.ts                  # Gemini SDK integration
├── workers/
│   └── index.js                       # Cloudflare Workers API
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                     # CI pipeline
│   │   └── genai-video-issue-analyzer.yml
│   └── aw/                            # GitHub Agentics workflows
├── action.yml                         # GitHub Action definition
├── Dockerfile                         # Docker container for Action
├── wrangler.toml                      # Cloudflare Workers config
└── package.json                       # Node.js dependencies
```

---

## Inputs

| name                                 | description                                                                                                                                                                      | required | default                                                                                                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `instructions`                       | Custom prompting instructions for each video.                                                                                                                                    | false    | Analyze the video and provide a summary of its content. Extract list of followup subissues if any. The transcript is your primary source of text information, ignore text in images. |
| `debug`                              | Enable debug logging ([GenAIScript Logging](https://microsoft.github.io/genaiscript/reference/scripts/logging/)).                                                                | false    |                                                                                                                                                                                      |
| `model_alias`                        | A YAML-like list of model aliases and model id: `translation: github:openai/gpt-4o`                                                                                              | false    |                                                                                                                                                                                      |
| `openai_api_key`                     | OpenAI API key                                                                                                                                                                   | false    |                                                                                                                                                                                      |
| `openai_api_base`                    | OpenAI API base URL                                                                                                                                                              | false    |                                                                                                                                                                                      |
| `azure_openai_api_endpoint`          | Azure OpenAI endpoint. In the Azure Portal, open your Azure OpenAI resource, Keys and Endpoints, copy Endpoint.                                                                  | false    |                                                                                                                                                                                      |
| `azure_openai_api_key`               | Azure OpenAI API key. \*\*You do NOT need this if you are using Microsoft Entra ID.                                                                                              | false    |                                                                                                                                                                                      |
| `azure_openai_subscription_id`       | Azure OpenAI subscription ID to list available deployments (Microsoft Entra only).                                                                                               | false    |                                                                                                                                                                                      |
| `azure_openai_api_version`           | Azure OpenAI API version.                                                                                                                                                        | false    |                                                                                                                                                                                      |
| `azure_openai_api_credentials`       | Azure OpenAI API credentials type. Leave as 'default' unless you have a special Azure setup.                                                                                     | false    |                                                                                                                                                                                      |
| `azure_ai_inference_api_key`         | Azure AI Inference key                                                                                                                                                           | false    |                                                                                                                                                                                      |
| `azure_ai_inference_api_endpoint`    | Azure Serverless OpenAI endpoint                                                                                                                                                 | false    |                                                                                                                                                                                      |
| `azure_ai_inference_api_version`     | Azure Serverless OpenAI API version                                                                                                                                              | false    |                                                                                                                                                                                      |
| `azure_ai_inference_api_credentials` | Azure Serverless OpenAI API credentials type                                                                                                                                     | false    |                                                                                                                                                                                      |
| `github_token`                       | GitHub token with `models: read` permission at least ([GitHub Models Permissions](https://microsoft.github.io/genaiscript/reference/github-actions/#github-models-permissions)). | false    |                                                                                                                                                                                      |
| `video_url`                          | Direct video URL to analyze (alternative to extracting from issue body). Used when triggered via workflow_dispatch.                                                              | false    |                                                                                                                                                                                      |
| `items`                              | List of specific items to extract from the video.                                                                                                                                | false    | API endpoints, model capabilities                                                                                                                                                    |
| `thinking_level`                     | Gemini 3 thinking level (`high`, `low`).                                                                                                                                         | false    | high                                                                                                                                                                                 |
| `media_resolution`                   | Gemini 3 media resolution (`high`, `low`).                                                                                                                                       | false    | high                                                                                                                                                                                 |

## Outputs

| name   | description                |
| ------ | -------------------------- |
| `text` | The generated text output. |

**Note**: The action also outputs the analysis results to the GitHub Step Summary (`$GITHUB_STEP_SUMMARY`) for easy viewing in the Actions tab.

---

## Usage

Add the following to your step in your workflow file.

```yaml
runs-on: ubuntu-latest
steps:
  - uses: actions/checkout@v4
  - uses: pelikhan/action-genai-video-issue-analyzer@v0
    with:
      github_token: ${{ secrets.GITHUB_TOKEN }}
      openai_api_key: ${{ secrets.OPENAI_API_KEY }} # Required for transcription
```

## Example

Save the following in `.github/workflows/genai-video-issue-analyzer.yml` file:

### For Issue-based Analysis (automatic trigger)

```yaml
name: genai video issue analyzer
on:
  issues:
    types: [opened, edited]
permissions:
  contents: read
  issues: write
  models: read
concurrency:
  group: ${{ github.workflow }}-${{ github.event.issue.number }}
  cancel-in-progress: true
jobs:
  genai-video-analyze:
    runs-on: ubuntu-latest
    services:
      whisper:
        image: onerahmet/openai-whisper-asr-webservice:latest
        env:
          ASR_MODEL: base
          ASR_ENGINE: openai_whisper
        ports:
          - 9000:9000
        options: >-
          --health-cmd "curl -f http://localhost:9000/docs || exit 1"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          --health-start-period 20s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with:
          path: .genaiscript/cache/**
          key: genaiscript-${{ github.run_id }}
          restore-keys: |
            genaiscript-
      - uses: pelikhan/action-genai-video-issue-analyzer@v0 # update to the major version you want to use
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### For Direct Video URL Analysis (manual trigger)

```yaml
name: genai video issue analyzer
on:
  workflow_dispatch:
    inputs:
      video_url:
        description: "Direct video URL to analyze"
        required: true
        type: string
      instructions:
        description: "Custom prompting instructions for the video"
        required: false
        default: "Analyze the video and provide a summary of its content. Extract list of followup subissues if any. The transcript is your primary source of text information, ignore text in images."
        type: string
permissions:
  contents: read
  models: read
jobs:
  genai-video-analyze:
    runs-on: ubuntu-latest
    services:
      whisper:
        image: onerahmet/openai-whisper-asr-webservice:latest
        env:
          ASR_MODEL: base
          ASR_ENGINE: openai_whisper
        ports:
          - 9000:9000
        options: >-
          --health-cmd "curl -f http://localhost:9000/docs || exit 1"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          --health-start-period 20s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with:
          path: .genaiscript/cache/**
          key: genaiscript-${{ github.run_id }}
          restore-keys: |
            genaiscript-
      - uses: pelikhan/action-genai-video-issue-analyzer@v0 # update to the major version you want to use
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          video_url: ${{ github.event.inputs.video_url }}
          instructions: ${{ github.event.inputs.instructions }}
          # Enable Gemini 3 optimizations
          thinking_level: high
          media_resolution: high
```

### Combined Workflow (both triggers)

```yaml
name: genai video issue analyzer
on:
  issues:
    types: [opened, edited]
  workflow_dispatch:
    inputs:
      video_url:
        description: "Direct video URL to analyze"
        required: true
        type: string
      instructions:
        description: "Custom prompting instructions for the video"
        required: false
        default: "Analyze the video and provide a summary of its content. Extract list of followup subissues if any. The transcript is your primary source of text information, ignore text in images."
        type: string
permissions:
  contents: read
  issues: write
  models: read
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  genai-video-analyze:
    runs-on: ubuntu-latest
    services:
      whisper:
        image: onerahmet/openai-whisper-asr-webservice:latest
        env:
          ASR_MODEL: base
          ASR_ENGINE: openai_whisper
        ports:
          - 9000:9000
        options: >-
          --health-cmd "curl -f http://localhost:9000/docs || exit 1"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          --health-start-period 20s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with:
          path: .genaiscript/cache/**
          key: genaiscript-${{ github.run_id }}
          restore-keys: |
            genaiscript-
      - uses: pelikhan/action-genai-video-issue-analyzer@v0 # update to the major version you want to use
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          video_url: ${{ github.event.inputs.video_url }}
          instructions: ${{ github.event.inputs.instructions }}
```

---

## Import GitHub Workspace (User Facing)

You can import an external GitHub repository to analyze its context (for "Technical Breakdown" checks) or to simply run the analyzer within that codebase's scope.

To import a workspace:

```bash
npx genaiscript run import-github-workspace
```

Follow the interactive prompts to provide the repository URL.

---

## API Endpoints (uvai.io)

| Method | Endpoint               | Description                                                         |
| ------ | ---------------------- | ------------------------------------------------------------------- |
| `GET`  | `/health`              | Health check with version and timestamp                             |
| `POST` | `/api/analyze`         | Analyze video from URL (JSON body: `{ videoUrl, outputMode }`)      |
| `POST` | `/api/analyze/youtube` | YouTube-specific analysis (JSON body: `{ youtubeUrl, outputMode }`) |

### Example Request

```bash
curl -X POST https://uvai.io/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID", "outputMode": "agentic"}'
```

---

## Next Steps / Roadmap

### Current Completion: ~75%

| Phase                        | Status         | Description                                         | % Complete |
| ---------------------------- | -------------- | --------------------------------------------------- | ---------- |
| **1. Core Infrastructure**   | ✅ Done        | GenAIScript, Docker, GitHub Action                  | 100%       |
| **2. AI Integration**        | ✅ Done        | Gemini 2.0 Flash, AgenticOutput schema              | 100%       |
| **3. Frontend MVP**          | ✅ Done        | Next.js UI, VideoInput, AnalysisResults             | 95%        |
| **4. API Layer**             | 🟡 In Progress | Cloudflare Workers deployed, needs full integration | 70%        |
| **5. Production Deployment** | 🟡 In Progress | uvai.io configured, needs secrets + testing         | 60%        |
| **6. Testing**               | ❌ Not Started | Unit tests, integration tests, E2E                  | 5%         |
| **7. Documentation**         | 🟡 In Progress | README updated, needs API docs                      | 80%        |

### Finish Line Requirements

1. **Step 1**: Complete Cloudflare Workers integration with Durable Objects for background video processing
2. **Step 2**: Add API route for real Gemini analysis (currently mock fallback when no API key)
3. **Step 3**: Deploy Next.js static export to Cloudflare Pages
4. **Step 4**: Set production secrets via `wrangler secret put`
5. **Step 5**: Add unit tests for `gemini.ts` and component tests
6. **Step 6**: End-to-end test with real YouTube video analysis
7. **Step 7**: Production launch verification at uvai.io

### Immediate Action Items

- [ ] Set `GOOGLE_API_KEY` in Cloudflare Workers secrets
- [ ] Configure KV namespace for caching (`VIDEO_CACHE`)
- [ ] Add comprehensive test suite
- [ ] Deploy final Next.js build to Cloudflare Pages

---

## Development

This action was automatically generated by [GenAIScript](https://microsoft.github.io/genaiscript/reference/github-actions) from the script metadata.
We recommend updating the script metadata instead of editing the action files directly.

- the action inputs are inferred from the script parameters
- the action outputs are inferred from the script output schema
- the action description is the script description
- the readme description is the script description
- the action branding is the script branding

To **regenerate** the action files (`action.yml`), run:

```bash
npm run configure
```

To lint script files, run:

```bash
npm run lint
```

To typecheck the scripts, run:

```bash
npm run typecheck
```

To build the Docker image locally, run:

```bash
npm run docker:build
```

To run the action locally in Docker (build it first), use:

```bash
npm run docker:start
```

## Upgrade

The GenAIScript version is pinned in the `package.json` file. To upgrade it, run:

```bash
npm run upgrade
```

## Release

To release a new version of this action, run the release script on a clean working directory.

```bash
npm run release
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable                | Required     | Description                             |
| ----------------------- | ------------ | --------------------------------------- |
| `GOOGLE_API_KEY`        | Yes          | Google Gemini API key for analysis      |
| `YOUTUBE_API_KEY`       | Yes          | YouTube Data API key                    |
| `GITHUB_TOKEN`          | Yes (Action) | GitHub token for issue asset resolution |
| `CLOUDSQL_PASSWORD`     | No           | PostgreSQL database password            |
| `RABBITMQ_URL`          | No           | RabbitMQ connection URL                 |
| `LOG_LEVEL`             | No           | Logging level (default: info)           |
| `USE_SECRETS_MANAGER`   | No           | Enable AWS Secrets Manager (production) |

---

## 🆕 New Features & Enhancements

This repository now includes several production-ready enhancements for optimization and reliability:

### 1. **Winston Logging** 🪵
Structured logging system with multiple log levels, file outputs, and detailed error tracking.

```typescript
import logger from './lib/logger';
logger.info('Processing video', { videoId, duration });
```

See [docs/NEW_FEATURES.md](docs/NEW_FEATURES.md#1-winston-logger) for details.

### 2. **AWS Secrets Manager Integration** 🔐
Secure secret management with automatic fallback to environment variables in development.

```typescript
import { getYouTubeApiKey } from './lib/secrets';
const apiKey = await getYouTubeApiKey();
```

See [docs/NEW_FEATURES.md](docs/NEW_FEATURES.md#2-aws-secrets-manager-integration) for details.

### 3. **RabbitMQ Queue Service** 🐰
Asynchronous message queuing for external API calls to prevent blocking during high load.

```typescript
import { publishMessage, QUEUES } from './lib/queue';
await publishMessage(QUEUES.VIDEO_ANALYSIS, { videoUrl });
```

See [docs/NEW_FEATURES.md](docs/NEW_FEATURES.md#3-rabbitmq-queue-service) for details.

### 4. **Playwright E2E Testing** 🎭
End-to-end testing across multiple browsers and mobile viewports.

```bash
npm run test:e2e
```

See [docs/TESTING.md](docs/TESTING.md) for details.

### 5. **Comprehensive Unit Tests** ✅
Unit tests for all core modules using Vitest with 80%+ coverage goal.

```bash
npm test
npm run test:coverage
```

See [docs/TESTING.md](docs/TESTING.md) for details.

### Documentation
- 📖 [New Features Guide](docs/NEW_FEATURES.md) - Detailed documentation for all new features
- 🧪 [Testing Guide](docs/TESTING.md) - Testing conventions and best practices
- 📋 [Environment Variables](.env.example) - Complete environment configuration template

---

## License

MIT License - See [LICENSE](LICENSE) for details.
