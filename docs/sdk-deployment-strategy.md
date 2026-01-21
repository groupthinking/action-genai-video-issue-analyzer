# SDK Deployment Strategy: Media URI Intelligence

**Objective**: Ingest media from URLs (Published Videos & Livestreams) rather than waiting for calendar invites.

## 1. Fireflies.ai (Recommended for URL-First Workflow)

**Why**: Native support for asynchronous URL ingestion.

- **Capabilities**:
  - `uploadAudio` Query: Accepts a public link (MP3, MP4) and processes it exactly like a recorded meeting.
  - Zero Infrastructure: No need to host a bot or manage media buffers.
  - Rich Data: Returns the same high-fidelity transcript, sentiment, and speaker benchmarks.
- **Implementation Path**:
  - **Endpoint**: `https://api.fireflies.ai/graphql`
  - **Mutation**:
    ```graphql
    mutation uploadAudio($input: AudioUploadInput) {
      uploadAudio(input: $input) {
        success
        title
        message
      }
    }
    ```
- **Verdict**: **PRIMARY**. It solves the "Intake URL" requirement immediately for all recorded media.

## 2. Zoom Video SDK (Legacy/Complex Path)

**Why**: High friction for URL ingestion.

- **The Hurdle**: The standard Web/Node SDKs cannot "watch" a video file. To pipe a URL (e.g., a YouTube stream or MP4) into a Zoom session, we must build a **Linux Native C++ Application**.
- **Architecture**:
  - `FFmpeg` decodes the URL stream -> Raw YUV420 Frames.
  - C++ App pipes Raw Frames -> `IZoomVideoSDKRawDataSender`.
- **Verdict**: **SECONDARY/DEPRECATED**. Only pursue if we need to _simulate_ a participant in a live call using a pre-recorded video. For pure analysis, it is over-engineering.

## 3. Vertex AI (Advanced Grounding)

**Why**: To add "World Knowledge" to the analysis.

- **Capabilities**:
  - **System Instructions**: Lock the agent into a "Business Strategist" persona (preventing generic generic output).
  - **Grounding**: Inject Google Search tools to verify claims in the video against real-time market data.
- **Integration**:
  - Direct MCP Tool integration for `generate_content` with `tools=[google_search_retrieval]`.

## Final Decision

We will shift the architecture to a **URL-First** approach using **Fireflies.ai** for ingestion and **Vertex AI** for agentic reasoning. This removes the need for a complex C++ media server.
