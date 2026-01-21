import { FLIP_SIDE_STRATEGY } from "../lib/strategies.mts"

script({
    title: "Flip-side Market Research Skill",
    description: "Implements the 'Flip-side Industry' strategy to find high-intent, unsexy niches.",
    parameters: {
        industry: { type: "string", description: "Massive industry (e.g., Wedding, Real Estate, Legal).", default: "Wedding" },
        focus: { type: "string", description: "info-product or software-tool.", default: "info-product" }
    }
});

const { industry, focus } = env.vars;
const { output } = env;

const { text } = await runPrompt(
    ctx => {
        ctx.$`${FLIP_SIDE_STRATEGY}`.role("system");
        ctx.$`Perform Flip-side Industry analysis for: ${industry}. Focus on: ${focus}.`.role("user");
    },
    {
        model: "google:gemini-2.0-flash-thinking-exp",
        label: `flip-side research for ${industry}`
    }
);

output.heading(3, `🚀 Flip-side Strategy: ${industry}`);
output.appendContent(text);
