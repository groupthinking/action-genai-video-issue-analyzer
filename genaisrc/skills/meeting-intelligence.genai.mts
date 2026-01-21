script({
    title: "Meeting Intelligence Skill",
    description: "Extracts actionable intelligence from meeting transcripts and media streams using patterns from Fireflies.ai and Zoom RTMS.",
    parameters: {
        meetingType: {
            type: "string",
            description: "Type of meeting (e.g., Sales, Strategy, Standup)",
            default: "Strategy"
        }
    }
});

const { meetingType } = env.vars;
const { output } = env;

const { text } = await runPrompt(
    ctx => {
        ctx.$`You are a meeting intelligence expert. Your goal is to extract high-fidelity action items and strategic insights.

## Intelligence Patterns (Ref: Fireflies/Zoom RTMS)
- **High-Intent Extraction**: Identify "Soft Commitments" (e.g., "I'll look into it") vs. "Hard Commitments".
- **Bot-less Awareness**: Assume the data comes from a direct media stream (clear audio, speaker identification).
- **Sentiment & Vibe**: Track the shifting sentiment during the call.

## Output Requirements
1. **Actionable Table**: [Task] | [Owner] | [Deadline] | [Priority]
2. **Strategic Pivot Points**: Any moment the conversation shifted the project trajectory.
3. **Sentiment Map**: Brief summary of the 'vibe' at start vs. end.
4. **Agentic Next Steps**: What an AI Agent should do NEXT to follow up on this.`.role("system");
        ctx.$`Analyze the meeting data for a ${meetingType} session.`;
    },
    {
        model: "google:gemini-2.0-flash-thinking-exp",
        label: "meeting intelligence analysis"
    }
);

output.heading(3, "📊 Meeting Intelligence Report");
output.appendContent(text);
