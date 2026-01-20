import { FLIP_SIDE_STRATEGY } from "../lib/strategies.mts"

script({
    title: "AI Execution Copilot",
    description: "Translates strategy into immediate market assets (Landing Pages, Ad Hooks, etc.).",
    parameters: {
        industry: { type: "string", default: "Wedding" },
        focus: { type: "string", default: "info-product" }
    },
});

const { industry, focus } = env.vars;
const { output } = env;

// 1. Run the Strategy Skill
const { text: researchResult } = await runPrompt(
    ctx => {
        ctx.$`${FLIP_SIDE_STRATEGY}`.role("system");
        ctx.$`Perform Flip-side Industry analysis for: ${industry}. Focus on: ${focus}.`.role("user");
    },
    { model: "google:gemini-2.0-flash-exp", label: "running research skill" }
);

// 2. Generate Market-Ready Assets
const { text: artifacts } = await runPrompt(
    ctx => {
        ctx.$`You are an 'Execution Agent'. Your job is to take market research and build the actual assets.`.role("system");
        ctx.$`Build the deliverables based on this strategy:

${researchResult}

## Target Deliverables:
1. **index.html**: A complete, single-file landing page using modern CSS. It must look premium (glassmorphism, clean typography, vibey gradients).
2. **ads.md**: A list of 5 ad headlines and 3 body copy variations.
3. **launch-plan.md**: A 5-step checklist to go live.`.role("user");
    },
    { model: "google:gemini-2.0-flash-exp", label: "generating deliverables" }
);

// 3. Write Deliverables to Disk (Simulating Strategy-to-Action)
const html = artifacts.match(/```html\n([\s\S]*?)```/)?.[1];
const ads = artifacts.match(/```markdown\n([\s\S]*?)```/)?.[1];
const plan = artifacts.match(/### launch-plan.md\n([\s\S]*?)$/)?.[1] || artifacts;

if (html) {
    await workspace.writeText(path.join("deliverables", "index.html"), html);
    output.p(`✅ Generated Landing Page: deliverables/index.html`);
}

if (ads) {
    await workspace.writeText(path.join("deliverables", "ads.md"), ads);
    output.p(`✅ Generated Ads: deliverables/ads.md`);
}

await workspace.writeText(path.join("deliverables", "strategy.md"), artifacts);
output.p(`✅ Generated Full Strategy Bundle: deliverables/strategy.md`);

output.heading(3, "🚀 Execution Copilot Status");
output.p("Deliverables have been pushed to the `deliverables/` folder. The strategy is now READY TO MARKET.");
output.appendContent(researchResult);
