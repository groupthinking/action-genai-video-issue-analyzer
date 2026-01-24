# UVAI Consolidation Strategy

> Decision: Merge UVAI capabilities into EventRelay monorepo
> Date: 2026-01-24

## Rationale

EventRelay already has:
- Complete MCP server ecosystem (`mcp-servers/`)
- Video processing pipeline (`youtube_uvai_mcp.py`)
- Agent orchestration (`src/agents/`)
- Firebase integration (`apps/firebase/`)
- Revenue pipeline (YouTube → Code → Deploy)

## What UVAI Adds (Keep These)

### 1. pgvector Embeddings
```
dataconnect/schema/schema.gql  → VideoEmbedding table
src/services/embedding.ts      → Vertex AI text-embedding-004
src/app/api/search/route.ts    → Semantic search API
```

### 2. Firebase Data Connect
```
dataconnect/                   → Cloud SQL GraphQL layer
```

### 3. Zero-Disk Video Streaming
```
src/lib/ingest-worker.ts       → yt-dlp → GCS (no local disk)
```

## Target Architecture

```
EventRelay/
├── apps/
│   ├── web/                    # React dashboard (existing)
│   └── uvai-api/               # NEW: Next.js API (from action-genai)
├── mcp-servers/
│   ├── python-suite/           # Existing Python MCPs
│   └── uvai-embeddings/        # NEW: pgvector search MCP
├── packages/
│   └── embeddings/             # NEW: Shared embedding utilities
└── dataconnect/                # NEW: From UVAI
```

## MCP Stack (Final)

| MCP | Source | Purpose |
|-----|--------|--------|
| Chrome DevTools | Official | Browser automation |
| GitHub | Official | Repo management |
| Firebase | Official | Backend/hosting |
| youtube_uvai_mcp | EventRelay | Video processing |
| uvai-embeddings | NEW | Semantic search |

## Migration Steps

1. [x] Create this strategy doc
2. [ ] Copy `dataconnect/` to EventRelay
3. [ ] Copy `src/services/embedding.ts` to EventRelay packages
4. [ ] Create embeddings MCP server wrapper
5. [ ] Update EventRelay's MCP registry
6. [ ] Archive action-genai-video-issue-analyzer

## Key Insight

> "Don't build what MCPs already provide. 
>  The Chrome DevTools MCP can navigate to any video and read the transcript in seconds.
>  The GitHub MCP can push results anywhere.
>  The Firebase MCP handles deployment.
>  We just need to wire them together."

---

*This document supersedes custom pipeline development.*