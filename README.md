# GitHub Action Video Issue Analyzer

This GitHub Action runs all video assets in an issue body through a LLM model to analyze the content, or can analyze a direct video URL when triggered via workflow_dispatch.
The default behavior is to summarize and extract task items but this can be customized through the `instructions` input.

The action outputs the analysis results to the GitHub Step Summary for easy viewing in the Actions tab.

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

| name | description |
| ---- | ----------- |

| `text` | The generated text output. |

**Note**: The action also outputs the analysis results to the GitHub Step Summary (`$GITHUB_STEP_SUMMARY`) for easy viewing in the Actions tab.

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

## Import GitHub Workspace (User Facing)

You can import an external GitHub repository to analyze its context (for "Technical Breakdown" checks) or to simply run the analyzer within that codebase's scope.

To import a workspace:

```bash
npx genaiscript run import-github-workspace
```

Follow the interactive prompts to provide the repository URL.

### "Analyze in GenAI" Badge

Add this badge to your `README.md` to let others know your repository is optimized for GenAI Video Analysis:

```markdown
[![Analyze with GenAI](https://img.shields.io/badge/Analyze_with-GenAI-blue?style=for-the-badge&logo=google-gemini)](https://github.com/groupthinking/action-genai-video-issue-analyzer)
```

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
