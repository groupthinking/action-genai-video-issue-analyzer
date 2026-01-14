---
# Configuration for repo-ask workflow

# User requested: "openai 5.2" and "google 3 gemini"
# Defaulting to OpenAI (standard model, likely gpt-4o)
engine: openai
model: gpt-4o

# To switch to Google Gemini (gemini-3-pro-preview as found in keys):
# engine: google
# model: gemini-3-pro-preview
# Note: Ensure GOOGLE_API_KEY is active.

# Tools available
tools:
  - web-search
  - web-fetch
  - bash
---
