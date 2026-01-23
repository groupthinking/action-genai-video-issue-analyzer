script({
  title: "Intent Validator - The 'Why'",
  model: "azure:gpt-5-chat",
  temperature: 0.5,
  files: "context.md"
})

// Load project context if available
let projectContext = ""

if (env.files.length > 0) {
  const contextFile = env.files.find(f => f.filename.endsWith("context.md"))
  if (contextFile) {
    projectContext = contextFile.content
    console.log("✅ Loaded project context from context.md\n")
  }
}

// Gather Intent Information
console.log("\n=== 🎯 INTENT VALIDATOR: The 'Why' ===\n")

// Problem Statement
const problemStatement = await host.input(
  "Problem Statement - What's actually broken? What observable behavior led us here?",
  { required: true }
)

// Value Proposition
const valueProposition = await host.input(
  "Value - What improvement will this create?",
  { required: true }
)

const beneficiary = await host.input(
  "For whom?",
  { required: true }
)

// The Stop Check
const isNecessary = await host.select(
  "The 'Stop' Check - Is this code necessary?",
  [
    { name: "yes", value: "yes", description: "Yes - This needs to be built" },
    { name: "no", value: "no", description: "No - We should reconsider" }
  ]
)

let whyNow = ""
let alternative = ""

if (isNecessary === "yes") {
  whyNow = await host.input("If Yes: Why now?", { required: true })
} else {
  alternative = await host.input("If No: What should we do instead?", { required: true })
}

// Single AI Validation
console.log("\n\n=== 🤖 AI Validation ===\n")

const evaluation = await runPrompt((_) => {
  if (projectContext) {
    _.def("PROJECT_CONTEXT", projectContext, {
      language: "markdown",
      ignoreEmpty: true
    })
  }
  
  _.def("PROBLEM_STATEMENT", problemStatement)
  _.def("VALUE_PROPOSITION", valueProposition)
  _.def("BENEFICIARY", beneficiary)
  _.def("IS_NECESSARY", isNecessary)
  
  if (isNecessary === "yes") {
    _.def("WHY_NOW", whyNow)
  } else {
    _.def("ALTERNATIVE", alternative)
  }
  
  _.$`You are an expert in intentional architecture and systems thinking.

${projectContext ? "## Project Context\n\nRefer to PROJECT_CONTEXT for project-specific details.\n" : ""}

## Intent to Validate

**Problem Statement:**
${problemStatement}

**Value Proposition:**
${valueProposition}

**Beneficiary:**
${beneficiary}

**Is Necessary:**
${isNecessary}

${isNecessary === "yes" ? `**Why Now:**\n${whyNow}` : `**Alternative Approach:**\n${alternative}`}

## Your Task

Evaluate this intent using the "5 Whys" technique:

1. **Problem Clarity** (0.0-1.0): Is the problem observable, specific, and verifiable?
2. **Value Articulation** (0.0-1.0): Is the value concrete and measurable?
3. **Beneficiary Alignment** (0.0-1.0): Does this serve the stated users' needs?
4. **Necessity Logic** (0.0-1.0): Is the "stop check" reasoning sound?
5. **Root Cause Depth** (0.0-1.0): Have we dug deep enough into the "why"?

${projectContext ? "Consider the project context when evaluating.\n" : ""}

## Response Format

Provide:
- APPROVED or NEEDS IMPROVEMENT
- Brief explanation (2-3 sentences)
- Scores for each criterion (format: "Problem Clarity: 0.85")
- 1-2 key questions or suggestions

Be direct and insightful.`
}, { 
  label: "Intent Validation",
  cache: false,
  temperature: 0.5
})

const aiResponse = evaluation.text
const isApproved = aiResponse.toUpperCase().includes("APPROVED")

console.log("\n" + aiResponse + "\n")

// Extract scores
const extractScore = (text: string, criterion: string): number => {
  const patterns = [
    new RegExp(`${criterion}[:\\s]+([0-9.]+)`, 'i'),
    new RegExp(`${criterion}[^0-9]*?([0-9.]+)`, 'i')
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return parseFloat(match[1])
  }
  return 0.75
}

const clarityScore = extractScore(aiResponse, "Problem Clarity")
const valueScore = extractScore(aiResponse, "Value Articulation")
const alignmentScore = extractScore(aiResponse, "Beneficiary Alignment")
const necessityScore = extractScore(aiResponse, "Necessity Logic")
const depthScore = extractScore(aiResponse, "Root Cause Depth")

const avgConfidence = ((clarityScore + valueScore + alignmentScore + necessityScore + depthScore) / 5 * 100).toFixed(0)

// Generate report
const timestamp = new Date().toISOString().slice(0,10)
const safeName = problemStatement.substring(0, 40).replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()

$`
FILE ./intent-validation-${safeName}-${timestamp}.md

# 🎯 Intent Validation: The "Why"

${projectContext ? `**Project:** ${projectContext.split('\n')[0].replace(/^#+ /, '')}` : '**Project:** [Project Name]'}  
**Date:** ${new Date().toLocaleString()}  
**Status:** ${isApproved ? "✅ Approved" : "⚠️ Needs Review"}  
**Confidence:** ${avgConfidence}%

---

## 1. The Intent (The "Why")

### Problem Statement
*What's actually broken? What observable behavior led us here?*

${problemStatement}

### Value
*What improvement will this create? For whom?*

**Value Created:**  
${valueProposition}

**Beneficiary:**  
${beneficiary}

### The "Stop" Check
*Is this code necessary?*

**${isNecessary === "yes" ? "✅ Yes" : "❌ No"}**

${isNecessary === "yes" ? `
**Why now?**  
${whyNow}
` : `
**What should we do instead?**  
${alternative}
`}

---

## 📊 Evaluation Scores

| Criterion | Score | Rating |
|-----------|-------|--------|
| **Problem Clarity** | ${(clarityScore * 100).toFixed(0)}% | ${clarityScore >= 0.8 ? "🟢 Excellent" : clarityScore >= 0.6 ? "🟡 Good" : "🟠 Needs Work"} |
| **Value Articulation** | ${(valueScore * 100).toFixed(0)}% | ${valueScore >= 0.8 ? "🟢 Excellent" : valueScore >= 0.6 ? "🟡 Good" : "🟠 Needs Work"} |
| **Beneficiary Alignment** | ${(alignmentScore * 100).toFixed(0)}% | ${alignmentScore >= 0.8 ? "🟢 Excellent" : alignmentScore >= 0.6 ? "🟡 Good" : "🟠 Needs Work"} |
| **Necessity Logic** | ${(necessityScore * 100).toFixed(0)}% | ${necessityScore >= 0.8 ? "🟢 Excellent" : necessityScore >= 0.6 ? "🟡 Good" : "🟠 Needs Work"} |
| **Root Cause Depth** | ${(depthScore * 100).toFixed(0)}% | ${depthScore >= 0.8 ? "🟢 Excellent" : depthScore >= 0.6 ? "🟡 Good" : "🟠 Needs Work"} |

**Overall Confidence:** ${avgConfidence}%

---

## 🤖 AI Evaluation

${aiResponse}

---

## 🎯 Next Steps

${isApproved && isNecessary === "yes" ? `
### ✅ Ready to Proceed

The intent is clear. Next:
1. Document the architecture approach ("The How")
2. Define technical requirements
3. Create implementation ticket(s)
4. Validate ticket names if needed
` : isApproved && isNecessary === "no" ? `
### ⛔ Do Not Build

Recommendation: ${alternative}

Next:
1. Validate alternative approach
2. Document decision rationale
3. Close or reprioritize related work
` : `
### ⚠️ Refine Intent

Address the issues identified above:
${clarityScore < 0.7 ? "- Clarify the problem statement\n" : ""}${valueScore < 0.7 ? "- Make value more concrete\n" : ""}${alignmentScore < 0.7 ? "- Strengthen beneficiary alignment\n" : ""}${necessityScore < 0.7 ? "- Improve necessity reasoning\n" : ""}${depthScore < 0.7 ? "- Dig deeper with '5 Whys'\n" : ""}
Then re-run validation.
`}

---

*Generated by Intentional Architecture Validator*
`

console.log(`\n📄 Report saved: intent-validation-${safeName}-${timestamp}.md`)
console.log(`📊 Confidence: ${avgConfidence}%`)
console.log(`🎯 Status: ${isApproved ? "✅ Approved" : "⚠️ Needs Review"}`)

if (!isApproved) {
  console.log("\n💡 Tip: Review the AI feedback and refine your intent before proceeding.")
}
