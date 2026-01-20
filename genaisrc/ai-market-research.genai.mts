script({
    title: "AI Market Research Agent",
    description: "Implements the 'Flip-side Industry' strategy to find high-intent, unsexy niches for AI businesses.",
    parameters: {
        industry: {
            type: "string",
            description: "The primary massive industry to analyze (e.g., Wedding, Real Estate, Legal).",
            default: "Wedding",
        },
        focus: {
            type: "string",
            description: "Focus area: 'info-product' or 'software-tool'.",
            default: "info-product",
        }
    }
});

const { industry, focus } = env.vars;
const { output } = env;

const flipSideStrategy = `You are a 'Vibe Marketer' and Business Strategist. Your goal is to find 'sauce' - high-intent, unsexy markets that are technically a 'flip-side' of massive, popular industries.

## Strategy: Flip-side Mirroring
- If the industry is Weddings (Happy/Mainstream), the flip-side is Divorce (Pain-point/High Intent).
- If the industry is Luxury Real Estate, the flip-side is Estate Planning or Foreclosure management.
- If the industry is New Car Sales, the flip-side is Lemon Law or specialized repair info-products.

## Output Requirements
1. **The Flip-side Alpha**: Identify the core unsexy niche.
2. **Market Size vs. Intent**: Explain why this market is better than the mainstream one.
3. **The '80% Head Start' Offer**: Describe an info-product or tool that provides immediate value.
4. **Copywriting Hooks**: Provide 3 'Vibe Marketing' hooks (e.g., 'What your lawyer won't tell you').
5. **Implementation Steps**: How to launch the landing page in < 60 mins.`;

const { text } = await runPrompt(
    ctx => {
        ctx.$`${flipSideStrategy}`.role("system");
        ctx.$`Perform Flip-side Industry analysis for: ${industry}. Focus on: ${focus}.`.role("user");
    },
    {
        model: "google:gemini-2.0-flash-exp",
        label: `flip-side research for ${industry}`
    }
);

output.heading(3, `🚀 Market Research: ${industry} Flip-side`);
output.appendContent(text);
