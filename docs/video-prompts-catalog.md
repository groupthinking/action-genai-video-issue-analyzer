# Video Prompts Catalog

> **Purpose**: This organized catalog extracts and categorizes all prompts, agent responses, and outcomes from the original RTF document. It serves as a reference guide for building video-to-action pipelines.

---

## Table of Contents

1. [Pipeline Overview](#1-pipeline-overview)
2. [Agent Definitions](#2-agent-definitions)
3. [Startup/Idea Validation Prompts](#3-startupidea-validation-prompts)
4. [Agent Memory Architecture](#4-agent-memory-architecture)
5. [Video Transcription & Analysis Prompts](#5-video-transcription--analysis-prompts)
6. [Next.js Build Workflow](#6-nextjs-build-workflow)
7. [UI/UX Design System Prompts](#7-uiux-design-system-prompts)
8. [On-Demand Deployed Software Platform](#8-on-demand-deployed-software-platform)
9. [Go-To-Market (GTM) Workflow](#9-go-to-market-gtm-workflow)
10. [First Principles Framework](#10-first-principles-framework)
11. [Technical Integration Standards](#11-technical-integration-standards)
12. [Decision-Making Framework](#12-decision-making-framework)
13. [Operational Excellence Standards](#13-operational-excellence-standards)

---

## 1. Pipeline Overview

### Core Philosophy

> **"HOW TO BUILD PIPELINE"**

The pipeline transforms video content into actionable intelligence through a structured, multi-agent approach.

#### Input Types Supported

| Input Type             | Description                                      |
| ---------------------- | ------------------------------------------------ |
| **Full business idea** | Complex conceptual business ideas for validation |
| **YouTube URL**        | Video URLs requiring transcription and analysis  |
| **Web URL**            | Any HTTPS link for content extraction            |
| **Video + Action**     | Direct video-to-workflow conversion              |

#### Core Principles

- **No Simulation**: Focus on real-world applications
- **Lowest Hanging Fruit**: Target easiest, least friction, high demand, low supply markets
- **Context Engineering**: Shift from basic prompt engineering to comprehensive context management

---

## 2. Agent Definitions

### 2.1 VTTA (Video Transcription & Timing Agent)

| Property           | Value                                                    |
| ------------------ | -------------------------------------------------------- |
| **Name**           | VTTA                                                     |
| **Role**           | Capture all dialogue and timestamp key events            |
| **Core Tasks**     | Transcribe all spoken content, note major subject shifts |
| **Tools Required** | Transcript Generation                                    |

#### Core Prompts/Instructions

```markdown
- Transcribe all spoken content chronologically
- Note major subject shifts (e.g., transition to sponsor, website demo)
- Capture critical timestamps for key events
```

---

### 2.2 CSDAA (Code Structure & Diff Analysis Agent)

| Property           | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| **Name**           | CSDAA                                                                |
| **Role**           | Extract and document all terminal commands, errors, and code changes |
| **Tools Required** | Terminal Output Capture, Diff Analysis                               |

#### Core Prompts/Instructions

```markdown
- Extract all terminal commands and outputs
- Document error-handling sequences (directory creation, failed builds, linting fixes)
- Capture prompt text used for projects
- Extract final project statistics and key features
```

---

### 2.3 OFSA (Output Formatting & Synthesis Agent)

| Property           | Value                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| **Name**           | OFSA                                                                  |
| **Role**           | Synthesize and structure output into chronological, actionable format |
| **Tools Required** | Markdown & Structure Engine, Mirrored Version Output                  |

#### Core Prompts/Instructions

```markdown
- Integrate VTTA's transcript with CSDAA's technical data
- Ensure strict chronological order
- Provide guidance for replicating workflows demonstrated
```

---

## 3. Startup/Idea Validation Prompts

### 7-Step Validation Process

> Use AI tools to validate a startup/app idea through a structured, 7-step process.

#### Step-by-Step Prompts

| Step       | Focus                                    | Key Questions                                                                                 |
| ---------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Step 1** | Reverse engineer the core problem        | What result does the idea create? What pain do users experience? What motivates users to pay? |
| **Step 2** | Understand target customer               | Who are they? What are their demographics, behaviors, and motivations?                        |
| **Step 3** | Map current solutions                    | What solutions or workarounds do they use? What's lacking?                                    |
| **Step 4** | Test riskiest assumptions                | What must be true for the idea to work? What early evidence is needed?                        |
| **Step 5** | Refine value proposition                 | How can the idea be made more valuable—narrower, faster, better, or more reliable?            |
| **Step 6** | Analyze market landscape                 | Who are the competitors? What makes the approach unique?                                      |
| **Step 7** | Outline build plan (MVP & feedback loop) | What are 5–10 practical steps to launch and validate with users? What tools can help?         |

#### Validation Guidance

> **Key Insight**: Validate _before_ you build—ensure there's a real user pain. Start narrow and expand only after you have strong user pull.

---

## 4. Agent Memory Architecture

### Memory Types

| Memory Type            | Description                                     | Component        |
| ---------------------- | ----------------------------------------------- | ---------------- |
| **Working Memory**     | Current task context                            | Prompt/Query     |
| **Short-Term/Session** | Conversation history, contextual subset         | SessionManager   |
| **Long-Term/Database** | Persistent user data, preferences, system rules | LongTermMemoryDB |

### Core Components

#### ContextualAgent

> The core AI orchestrator that receives user input, determines tool use, and generates final responses.

#### SessionManager

> Manages conversation history (chat buffer) and maintains the currently relevant contextual subset of long-term data.

#### LongTermMemoryDB

> Stores persistent user data (preferences, orders, profiles) and system rules (tool efficiency/constraints).

#### ToolExecutor

> Executes external functions, specifically querying the product catalog based on semantic search.

#### MemoryProcessorLLM

> A specialized LLM used asynchronously to summarize complex session data into discrete, storable facts for the LTMDB.

#### SystemContextManager

> Manages the Model Context Protocol (MCP) and tool-specific memory constraints.

---

### Coordinated Prompt Sequence (Example: Pet Shop)

#### P1: Initial Query and Context Retrieval

```json
{
  "user_id": "Aja_user_123",
  "query": "I just got a new LLM! What types of tools and protocols should I look for?"
}
```

**Instructions for ContextualAgent:**

1. Initiate a new session for `user_id`
2. Request relevant long-term data from the `LongTermMemoryDB`
3. Determine the appropriate external function (`ToolExecutor`) needed
4. Use the retrieved context and current query to execute the tool search

#### P2: Long-Term Memory Retrieval

**Instructions for SessionManager:**

1. Current Session ID: [Generated Session ID]
2. Query the `LongTermMemoryDB` for attributes related to `user_id`
3. Inject the resulting subset of memories into the session context

#### P3: Tool Execution

**Instructions for ToolExecutor:**

1. Execute semantic search on product catalog
2. Apply semantic filters from SessionManager context
3. Return top 5 relevant product results

#### P4: Long-Term Memory Update & Consolidation

**Instructions for MemoryProcessorLLM:**

1. Analyze the final conversation transcript
2. Identify new, persistent facts about the user
3. Generate concise, structured entries for each new fact
4. Store feedback about tool performance
5. Create system constraint memories to avoid incorrect tool usage

---

## 5. Video Transcription & Analysis Prompts

### Master Prompt

> Deliver a precise, temporally aligned transcript and analysis of the video content. Focus heavily on the technical actions and resulting code changes within terminal environments.

### Capture Requirements

```markdown
**CAPTURE** all spoken content and technical operations (terminal commands, output, code updates) chronologically.
```

### Output Structure

| Section                  | Content                                      |
| ------------------------ | -------------------------------------------- |
| **Transcript**           | Full dialogue with timestamps                |
| **Technical Operations** | Terminal commands, errors, outputs           |
| **Code Changes**         | Diffs, file modifications, project structure |
| **Key Insights**         | Actionable guidance for replication          |

---

## 6. Next.js Build Workflow

### Project Requirements

| Requirement    | Specification                        |
| -------------- | ------------------------------------ |
| **Framework**  | Next.js 14+ with App Router          |
| **Styling**    | Tailwind CSS                         |
| **Language**   | TypeScript (strict)                  |
| **i18n**       | Italian and English routing          |
| **Static Gen** | `generateStaticParams` for all pages |
| **Structure**  | 5-7 unique vertical blocks per page  |

### Build Process Guidance

```markdown
1. Use Claude Code (Sonnet 4.5) for cost efficiency and speed
2. Implement the build in stages, starting with basic Next.js project structure
3. Prioritize creating the basic structure before modifying files
4. Establish core data structures (services.ts, locations.ts, i18n.ts)
5. Trust the iteration—allow Claude to attempt the build (npm run build)
6. Analyze failures—review TypeScript errors from build output
7. Claude V2.0.0 can apply solutions across multiple files at once
```

### Example Project Statistics

| Metric                       | Value                     |
| ---------------------------- | ------------------------- |
| **Total Pages Generated**    | 142                       |
| **Homepage Pages**           | 2 (Italian & English)     |
| **Service Pages**            | 6                         |
| **Service + Location Pages** | 96                        |
| **Location Pages**           | 32                        |
| **Contact Pages**            | 2                         |
| **404 Pages**                | 2                         |
| **Build Time**               | ~10 minutes (632 seconds) |

### Technical Stack

```markdown
- Next.js 14.2.23 with App Router
- TypeScript
- Tailwind CSS
- Static generation with generateStaticParams
```

---

## 7. UI/UX Design System Prompts

### Three-Step Process

A synergistic approach using human curation and LLM tooling.

### Agent Roles

| Agent  | Role                                                 | Output Location                        |
| ------ | ---------------------------------------------------- | -------------------------------------- |
| **A1** | Find and select UI screens matching app philosophy   | `design-system/ref-images/`            |
| **A2** | Analyze reference images, extract design information | `design-system/competitor-analysis.md` |
| **A3** | Create comprehensive style guide from analysis       | `design-system/styles.md`              |
| **A4** | Generate React/Tailwind UI components                | `design-system/styles-new.md`          |

---

### A2 Prompt: `/extract-it` Command

```markdown
You are an expert UX/UI designer.
Your job is to fill out a style guide based on the attached images.

Instructions:

- Wrap your entire thought process in <pondering> tags
- Consider the app, its aesthetics, principles, and how it makes the user feel
- Repeat the exercise for each group of images
- Discern and group images based on style and aesthetic

Output Format:

1. **Color Palette**
   - Primary Colors
   - Secondary Colors
   - Accent Colors
   - Functional Colors

2. **Typography**
   - Font Family
   - Weights
   - Text Styles

3. **Component Styling**
   - Buttons
   - Cards
   - Input Fields
   - Icons

4. **Spacing Definitions**
   - Micro
   - Small
   - Medium
   - Large

5. **Animation Patterns**
   - Standard
   - Emphasis
   - Micro
   - Page Transitions

6. **Dark Mode**
   - Dark Background
   - Dark Surface
   - Dark Primary
   - Dark Text

Place your output analysis inside of design-system/competitor-analysis.md
```

---

### A2 Extension: `/expand-it` Command

```markdown
Expand on each of your respective views expressed inside of the <pondering> tags.
Return a **"How To Leverage"** and **"Philosophy"** section inside of each Style Guide.
The sections should be written as if they are instructions for new employees on how to use the style guide.

Add the comprehensive Style Guide (how to leverage, philosophy, as well as the raw style guide) into design-system/styles.md
```

---

### A4 Prompt: `/design-it` Command

```markdown
You are an industry-veteran SaaS product designer with experience building high-touch UIs for FANG-style companies.
Your goal is to turn the provided context, guidelines, and user inspiration into a functional UI design.

## Guidelines

### Aesthetics

- **Bold simplicity** with intuitive navigation creating frictionless experiences
- **Breathable whitespace** complemented by strategic color accents for visual hierarchy
- **Strategic negative space** calibrated for cognitive breathing room and content prioritization
- **Systematic color theory** applied through subtle gradients and purposeful accent placement

### Practicalities

- Simulate an iPhone device frame (this is a design exercise)
- Use Lucide React icons
- Use Tailwind 4.1 for CSS
- Do not render scroll bars

### Task

Follow the guidelines above precisely to ensure correctness.
Your output should be a horizontal series of vertical screens showcasing each view specified below.
Always put new screen-series on a new row.
Give me 3 looks of the following screen.
Each should be a unique take on the core concept, but conform to the overall app style and philosophy.

Ensure outputs render correctly through the main app root of Create React App.
Each screen should be a separate, contained component.
```

---

### Example Screen Request

```markdown
Handle the "AI limits reached" state:

- Display a soft paywall/limit message
- Show a visual progress bar
- Provide an "Unlock unlimited" CTA
- Offer a "Continue tomorrow" secondary option
```

---

## 8. On-Demand Deployed Software Platform

### Core Vision

> Create an On-Demand Deployed Software Platform that automates the entire developer workflow. The platform solves the problem of manual coordination between various tools and services.

### Key Use Cases

| Use Case                                   | Description                                                                         |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| **"Build what I saw in this video"**       | System watches a YouTube tutorial, creates blueprint, generates working application |
| **"Deploy this to production"**            | Handles entire DevOps pipeline from Docker containerization to cloud setup          |
| **"Turn this tutorial into working code"** | YouTube URL converted to live React app, GitHub repository, deployment pipeline     |

---

### Core Pipeline Flow

```
User Input (URL/Task)
    ↓
Video Query (youtube-caption-extractor.git)
    ↓
Video Pack (Portable Data Artifact)
    ↓
Orchestrator (MCP + A2A)
    ↓
Specialized Agents
    ↓
GitHub Repository + Code Generation
    ↓
Deployment (Docker, Fly.io, Netlify)
```

---

### Video Pack Schema

| Field                   | Description                  |
| ----------------------- | ---------------------------- |
| `video_id`              | Unique video identifier      |
| `transcript`            | Full transcription           |
| `keyframes`             | Important visual frames      |
| `code_snippets`         | Extracted code examples      |
| `inferred_requirements` | Derived project requirements |

---

### Backend Architecture

| Component                            | Role                                     |
| ------------------------------------ | ---------------------------------------- |
| `backend/main.py`                    | API Gateway (HTTP + WebSocket)           |
| `backend/video_processor_factory.py` | Factory Pattern for video processors     |
| `agents/`                            | Specialized task agents                  |
| `ai_synthesis_agent.py`              | Query fan-out and multi-source synthesis |

---

### Phased Rollout

| Phase       | Focus                                                    |
| ----------- | -------------------------------------------------------- |
| **Phase 1** | "YouTube-to-Repo" MVP (video analysis + code generation) |
| **Phase 2** | "One-Click Deploy" (Vercel, Netlify)                     |
| **Phase 3** | Professional features (self-healing, IaC, CI/CD)         |
| **Phase 4** | "Template Marketplace" (sharing + reusing blueprints)    |

---

## 9. Go-To-Market (GTM) Workflow

### Action Plan Flow

```
DISCOVER → VERIFY → REASON/PLAN → README → BUILD → STEP BY STEP EXECUTION → LAUNCH → SCALE
```

### Multi-Stage Prompt

#### STAGE 1 — DISCOVER

```markdown
• Identify core problem, target segment(s), and value gap
• Generate 3 validated customer personas with pain, goals, demog + validation experiments
• Synthesize market demand signals, competitor snapshots, and existing solution shortfalls
```

#### STAGE 2 — HOOK

```markdown
• Craft 3 high-converting value propositions/messages
• Write 5 promo headlines, ad angles, and viral loop ideas
• Define brand voice, tone, and key messaging pillars
```

#### STAGE 3 — PLAN (PRD)

```markdown
Using ChatPRD-style PM coach:
• Produce full PRD with sections: overview, user stories, features, UX flow, tech stack, data requirements, roadmap, metrics/KPIs, success criteria
• Prioritize top 5 MVP features with RICE scores
• Suggest go-to-market pricing and monetization models
• Include coach feedback, gaps, and improvement notes
```

#### Additional Deliverables

| Category             | Deliverables                                     |
| -------------------- | ------------------------------------------------ |
| **Landing Page**     | Hero copy, features, social proof                |
| **Ad Copy**          | Facebook, Google, TikTok variants                |
| **Video Scripts**    | 15s, 30s, 60s with shot lists                    |
| **Email Campaigns**  | Welcome + up-sell/retention triggers             |
| **Growth Mechanics** | Loops, virality, analytics schema                |
| **Automation**       | CRM bot, analytics alerts, ad-spend optimization |

---

## 10. First Principles Framework

### Phase 1: Foundation — "Assume Nothing"

```markdown
• Count Everything: Begin every analysis by systematically counting folders, files, components, conversations, or data points
• Read Everything: Access full contents, not partial views or assumptions based on names
• Map Relationships: Document connections, dependencies, and interactions as discovered
• Log Discoveries: Maintain running audit trail of findings, hypotheses, and revisions
```

### Phase 2: First Principles Decomposition

```markdown
• Root Cause Analysis: Identify fundamental drivers and constraints
• Sequential Thinking: Apply IF/THEN logic chains and cause-effect relationships
• Market Context: Position discoveries against market demand, scarcity, and evolutionary advantages
• Validation Logic: Test each assumption against observable evidence
```

### Phase 3: State Management & Checkpoints

```markdown
• Checkpoint Creation: Establish verification points before major changes
• Audit Trail: Document what changed, why, and what was the previous state
• Error Tracking: Log errors, bottlenecks, opportunities, and enhancements
• State Continuity: Ensure knowledge transfers across time and contexts
```

---

## 11. Technical Integration Standards

### MCP (Model Context Protocol) Operations

| Standard                 | Description                                                                   |
| ------------------------ | ----------------------------------------------------------------------------- |
| **Tool Priority**        | Always create baseline plan and use `project_knowledge_search` first          |
| **Context Efficiency**   | Maintain awareness of available tools: Linear, Cloudflare, GitHub, filesystem |
| **Real-time Processing** | Leverage production MCP, A2A, BASE64 infrastructure                           |
| **Security Compliance**  | Follow AES-256-GCM encryption standards and permission-based access           |

---

### Multi-Modal Intelligence Stack

| Capability               | Description                                                                     |
| ------------------------ | ------------------------------------------------------------------------------- |
| **Video Processing**     | Universal domain (automation, education, business, technical, DIY, programming) |
| **AI Routing**           | Intelligent provider selection (Grok-4, Claude, GPT) with cost optimization     |
| **RAG Integration**      | Context enhancement via vector stores                                           |
| **Real-time Validation** | Anti-simulation framework for authenticity                                      |

---

### Enterprise Architecture Layers

| Layer              | Components                                        |
| ------------------ | ------------------------------------------------- |
| **Presentation**   | React frontend, Browser extension                 |
| **Application**    | MCP Server, Agent Framework, API Orchestration    |
| **Infrastructure** | Unified MCP DevContainer Runtime (dev + prod)     |
| **Commercial**     | SaaS platform, Billing integration, Multi-tenancy |

---

## 12. Decision-Making Framework

### 7-Stage Decision Engine

| Stage                      | Purpose                                                         |
| -------------------------- | --------------------------------------------------------------- |
| **Intent Discovery**       | Extract user's true intent (95%+ confidence)                    |
| **Verification**           | Strategic questioning for clarity                               |
| **Weighted Analysis**      | Multi-dimensional scoring (Impact, Resources, Timeline, Market) |
| **Hidden Insights**        | Detect underlying motivations and constraints                   |
| **Probability Assessment** | Best/likely/worst case scenario modeling                        |
| **Opportunity Cost**       | Evaluate trade-offs and alternatives                            |
| **Execution Decision**     | Proceed with confidence score >95% or clarify further           |

---

### Validation Requirements

```markdown
• No Forward Movement: Until live testing validates success at each step
• Evidence-Based: Every decision backed by observable data
• Commercial Viability: Maintain focus on $1M+ ARR objectives
• Risk Management: Identify bottlenecks and mitigation strategies
```

---

## 13. Operational Excellence Standards

### Quality Metrics

| Metric                    | Target                                     |
| ------------------------- | ------------------------------------------ |
| **Assembly Success Rate** | >90% working solutions                     |
| **Processing Speed**      | <5 seconds discovery, <30 seconds assembly |
| **User Satisfaction**     | >4.5/5 rating                              |
| **ROI Multiplication**    | 100x+ vs manual approaches                 |

---

### Continuous Improvement Loop

| Area                          | Focus                                            |
| ----------------------------- | ------------------------------------------------ |
| **Performance Monitoring**    | Real-time metrics and SLA compliance             |
| **User Interaction Learning** | Adapt based on outcomes and feedback             |
| **Agent Evolution**           | Improve collective intelligence over time        |
| **Knowledge Synthesis**       | Build comprehensive understanding across domains |

---

### Strategic Capabilities

| Capability                    | Description                                  |
| ----------------------------- | -------------------------------------------- |
| **First Principles Analysis** | Fundamental process understanding            |
| **Sequential Thinking**       | Logical progression with validation points   |
| **Interconnected Systems**    | Leverage unrelated aspects for innovation    |
| **Market Reality Check**      | Validate against demand, evolution, scarcity |
| **Gap Analysis**              | Why hasn't this been solved before?          |

---

### Infrastructure Standards

| Standard                     | Implementation                                       |
| ---------------------------- | ---------------------------------------------------- |
| **Security First**           | Permission-based access, audit trails, encryption    |
| **Performance Optimization** | Caching, rate limiting, load distribution            |
| **Scalability Planning**     | Multi-tenancy, enterprise features, API monetization |
| **Commercial Integration**   | Billing, team collaboration, private repositories    |

---

### Value Proposition

> **Immediate Value Delivery**: Reduce knowledge worker time by >95% while providing more comprehensive analysis than single-agent solutions.

> **Strategic Advantage**: Coordinated intelligence via messaging bus makes this approach superior to isolated AI tools.

---

## Agent Coordination Hierarchy

### Master Controller Role

```markdown
• Role: Strategic oversight, decision coordination, quality assurance
• Authority: All specialized agents report to Master Controller
• Responsibility: Maintain system coherence and commercial objectives
```

### Specialized Agent Types

| Type                        | Function                                             |
| --------------------------- | ---------------------------------------------------- |
| **Data Integration Agents** | Connect enterprise data sources via MCP connectors   |
| **Analysis Agents**         | Process video, documents, code with domain expertise |
| **Generation Agents**       | Create content, code, workflows, and recommendations |
| **Validation Agents**       | Test, verify, and quality-check all outputs          |
| **Communication Agents**    | Handle A2A messaging and state synchronization       |

---

### Agent Deployment Protocol

```markdown
1. Need Assessment: Identify specific task requirements and expertise needed
2. Agent Selection: Choose or create context-efficient experts with appropriate tools
3. Instruction Setting: Provide clear requirements, objectives, and success criteria
4. Monitor & Coordinate: Oversee agent performance and inter-agent communication
5. Results Integration: Synthesize agent outputs into coherent solutions
```

---

## Quick Reference: Key Commands

| Command       | Purpose                               | Output Location                        |
| ------------- | ------------------------------------- | -------------------------------------- |
| `/extract-it` | Analyze visual inputs for style guide | `design-system/competitor-analysis.md` |
| `/expand-it`  | Add philosophy and usage instructions | `design-system/styles.md`              |
| `/design-it`  | Generate React/Tailwind UI components | `design-system/styles-new.md`          |
| `/rewind`     | Restore conversational context        | N/A                                    |

---

## Appendix: Technology Stack Reference

| Category       | Tools                                              |
| -------------- | -------------------------------------------------- |
| **LLMs**       | Claude Code, Gemini, GPT-4, Grok-4                 |
| **Frameworks** | Next.js, React, FastAPI, LangChain                 |
| **Databases**  | Vector DB (Chroma, Pinecone), PostgreSQL/Spanner   |
| **Deployment** | Docker, Fly.io, Netlify, Vercel, GitHub Codespaces |
| **Protocols**  | MCP (Model Context Protocol), A2A                  |
| **Security**   | AES-256-GCM encryption                             |

---

_Document generated from original RTF file: `video prompts.rtf`_
_Last updated: 2026-01-19_
