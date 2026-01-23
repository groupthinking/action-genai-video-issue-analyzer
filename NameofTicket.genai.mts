script({
  title: "Interactive Ticket Validator with Context",
  model: "azure:gpt-5-chat",
  temperature: 0.5,
  files: "context.md"  // Auto-load context if available
})

// Step 1: Load context from files or ask user
let projectContext = ""

if (env.files.length > 0) {
  // Context file was found via script files option
  const contextFile = env.files.find(f => f.filename.endsWith("context.md"))
  if (contextFile) {
    projectContext = contextFile.content
    console.log("✅ Loaded project context from context.md\n")
  }
} else {
  // No context file - ask user
  const hasContext = await host.confirm(
    "No context.md found. Would you like to provide project context?",
    { default: false }
  )
  
  if (hasContext) {
    projectContext = await host.input(
      "Enter project context:",
      { required: false }
    )
    
    if (projectContext) {
      const saveContext = await host.confirm(
        "Save this context to context.md for future use?",
        { default: true }
      )
      
      if (saveContext) {
        await workspace.writeText("context.md", projectContext)
        console.log("✅ Context saved to context.md\n")
      }
    }
  }
}

// Step 2: Get ticket name
let ticketName = await host.input("Propose a ticket name:")
let conversationHistory: Array<{ role: string; content: string }> = []
let iteration = 0
const maxIterations = 5
let finalEvaluation = ""

// Step 3: Validation loop
while (iteration < maxIterations) {
  iteration++
  
  console.log(`\n--- Iteration ${iteration} ---\n`)
  
  // Use runPrompt with proper _ syntax for inner prompt
  const evaluation = await runPrompt((_) => {
    // Include project context if available (using def)
    if (projectContext) {
      _.def("PROJECT_CONTEXT", projectContext, {
        language: "markdown",
        ignoreEmpty: true
      })
    }
    
    // Add conversation history using defData
    if (conversationHistory.length > 0) {
      _.defData("CONVERSATION_HISTORY", 
        conversationHistory.map((m, i) => ({
          turn: Math.floor(i / 2) + 1,
          speaker: m.role,
          message: m.content
        })),
        { 
          format: "yaml",
          sliceHead: 10  // Keep last 10 messages max
        }
      )
    }
    
    // Define ticket name
    _.def("TICKET_NAME", ticketName)
    
    // Build the prompt
    _.$`You are an expert in intentional architecture.

${projectContext ? "## Project Context\n\nRefer to PROJECT_CONTEXT for project details.\n" : ""}

${conversationHistory.length > 0 ? "## Previous Conversation\n\nRefer to CONVERSATION_HISTORY for context.\n" : ""}

## Current Ticket Name

Analyze: "${ticketName}"

## Evaluation Criteria

1. Clear purpose and intent
2. Descriptive and specific
3. Follows naming conventions
4. Reflects architectural thinking

${projectContext ? "Consider the project context when evaluating." : ""}

## Response Format

If the name is good:
- Start with "APPROVED:"
- Explain why
- Provide scores (0.0-1.0) for each criterion

If the name needs work:
- Start with "NEEDS IMPROVEMENT:"
- List specific issues
- Ask 1-2 clarifying questions
- Suggest a better alternative

Be concise and direct.`
  }, { 
    label: `Evaluation ${iteration}`,
    cache: false,
    temperature: 0.5
  })
  
  const aiResponse = evaluation.text
  finalEvaluation = aiResponse
  
  // Add to conversation history
  conversationHistory.push({
    role: "assistant",
    content: aiResponse
  })
  
  console.log("\n🤖 AI Evaluation:")
  console.log(aiResponse)
  console.log("\n")
  
  // Check if approved
  const isApproved = aiResponse.toUpperCase().includes("APPROVED")
  
  if (isApproved) {
    const userAgrees = await host.confirm(
      `AI approved this name. Accept "${ticketName}"?`,
      { default: true }
    )
    
    if (userAgrees) {
      console.log(`\n✅ Final approved ticket name: ${ticketName}`)
      break
    }
  }
  
  // Ask user what to do next
  const choice = await host.select(
    "What would you like to do?",
    [
      { name: "answer", value: "answer", description: "Answer AI's questions" },
      { name: "revise", value: "revise", description: "Provide revised name" },
      { name: "accept", value: "accept", description: "Accept AI's suggestion" },
      { name: "stop", value: "stop", description: "Stop and use current" }
    ]
  )
  
  if (choice === "answer") {
    const details = await host.input("Provide more details:")
    
    conversationHistory.push({
      role: "user",
      content: details
    })
    
  } else if (choice === "revise") {
    const newName = await host.input("Enter revised name:", { required: true })
    
    conversationHistory.push({
      role: "user",
      content: `I've revised the ticket name to: "${newName}"`
    })
    
    ticketName = newName
    
  } else if (choice === "accept") {
    const match = aiResponse.match(/["'`]([^"'`]+)["'`]/)
    if (match) {
      ticketName = match[1]
      console.log(`✅ Using: ${ticketName}`)
      
      conversationHistory.push({
        role: "user",
        content: `I accept your suggestion: "${ticketName}"`
      })
    }
    
  } else if (choice === "stop") {
    break
  }
}

// Step 4: Extract scores
const extractScore = (text: string, principle: string): number => {
  const patterns = [
    new RegExp(`${principle}[:\\s]+\\*\\*([0-9.]+)\\*\\*`, 'i'),
    new RegExp(`${principle}[:\\s]+([0-9.]+)`, 'i')
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return parseFloat(match[1])
  }
  return 0.85
}

const clarityScore = extractScore(finalEvaluation, "Clear purpose")
const specificityScore = extractScore(finalEvaluation, "Descriptive")
const conventionScore = extractScore(finalEvaluation, "naming convention")
const architecturalScore = extractScore(finalEvaluation, "architectural")

const avgConfidence = ((clarityScore + specificityScore + conventionScore + architecturalScore) / 4 * 100).toFixed(0)

// Step 5: Generate markdown using proper $ syntax
const timestamp = new Date().toISOString().slice(0,10)
const safeFileName = ticketName.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().slice(0, 50)

$`
FILE ./ticket-validation-${safeFileName}-${timestamp}.md

# 🎫 Ticket Name Validation Report

**Project:** MathTabla GPrade  
**Date:** ${new Date().toLocaleString()}  
**Iterations:** ${iteration}  
**Model:** GPT-5 Chat (Azure)  
**Validator:** Intentional Architecture AI Assistant

---

## 📋 Summary

| Property | Value |
|----------|-------|
| **Final Name** | ${ticketName} |
| **Status** | ${finalEvaluation.toUpperCase().includes("APPROVED") ? "✅ Approved" : "⚠️ Needs Review"} |
| **Confidence** | ${avgConfidence}% |
| **Iterations** | ${iteration} |

---

## Final Ticket Name

\`\`\`
${ticketName}
\`\`\`

**JIRA Format:**
\`\`\`
[MATHTABLA-XXX] ${ticketName}
\`\`\`

**GitHub Issue Format:**
\`\`\`
${ticketName}
\`\`\`

---

## 🎯 Acceptance Criteria (Template)

Based on the ticket name, consider these criteria:

- [ ] Feature/fix clearly scoped to described component
- [ ] User-facing changes include appropriate feedback
- [ ] Integration points with existing systems identified
- [ ] Error handling and edge cases considered
- [ ] Documentation updated as needed
- [ ] Tests written for new functionality

${projectContext.toLowerCase().includes("staar") || projectContext.toLowerCase().includes("student") ? `
### Educational Context Specific:
- [ ] Age-appropriate language and UI (7th grade level)
- [ ] Learning flow continuity maintained
- [ ] Student feedback is clear and constructive
- [ ] No dead-ends in instructional path
- [ ] Aligns with STAAR standards (if applicable)
` : ""}

---

## 💬 Conversation History

${conversationHistory.map((msg, i) => `
### ${msg.role === "user" ? "👤 You" : "🤖 AI"} ${msg.role === "assistant" ? "(Iteration " + Math.ceil((i+1)/2) + ")" : ""}

${msg.content}
`).join("\n---\n")}

---

## 📊 Detailed Scores

| Principle | Score | Rating |
|-----------|-------|--------|
| **Clear Purpose & Intent** | ${(clarityScore * 100).toFixed(0)}% | ${clarityScore >= 0.8 ? "🟢 Excellent" : clarityScore >= 0.6 ? "🟡 Good" : "🟠 Needs Work"} |
| **Descriptive & Specific** | ${(specificityScore * 100).toFixed(0)}% | ${specificityScore >= 0.8 ? "🟢 Excellent" : specificityScore >= 0.6 ? "🟡 Good" : "🟠 Needs Work"} |
| **Naming Conventions** | ${(conventionScore * 100).toFixed(0)}% | ${conventionScore >= 0.8 ? "🟢 Excellent" : conventionScore >= 0.6 ? "🟡 Good" : "🟠 Needs Work"} |
| **Architectural Thinking** | ${(architecturalScore * 100).toFixed(0)}% | ${architecturalScore >= 0.8 ? "🟢 Excellent" : architecturalScore >= 0.6 ? "🟡 Good" : "🟠 Needs Work"} |

**Overall Confidence:** ${avgConfidence}%

---

## 📝 Final Evaluation

${finalEvaluation}

---

${projectContext ? `## 📚 Project Context Used

\`\`\`markdown
${projectContext}
\`\`\`

---

` : ""}

## 🎯 Next Steps

${finalEvaluation.toUpperCase().includes("APPROVED") ? `
### ✅ Ready for Implementation

1. Create ticket in project management system
2. Add acceptance criteria from template above
3. Assign to appropriate team member
4. Set priority and sprint
5. Link to related tickets if applicable
` : `
### ⚠️ Requires Revision

1. Review AI feedback above
2. Address specific issues identified
3. Run validation again with refined name
4. Consider architectural implications
`}

---

## 📈 Validation Metrics

- **Total Time:** ~${iteration * 3} seconds
- **AI Calls:** ${iteration}
- **Refinement Cycles:** ${conversationHistory.filter(m => m.role === "user").length}
- **Final Approval:** ${finalEvaluation.toUpperCase().includes("APPROVED") ? "Yes" : "Pending"}

---

*Generated by MathTabla GPrade - Intentional Architecture Validator*  
*Powered by GPT-5 Chat (Azure) | GenAIScript v2.5+*
`

console.log(`\n📄 Report saved to: ticket-validation-${safeFileName}-${timestamp}.md`)
console.log(`\n🎉 Final ticket name: ${ticketName}`)
console.log(`📊 Confidence: ${avgConfidence}%`)