import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required");
}

export const genAI = new GoogleGenerativeAI(apiKey);

export async function analyzeContract(contractText: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const prompt = `You are a government contract analysis expert. Analyze this contract and provide:
1. Contract Type (e.g., IT Services, Construction, Consulting)
2. Estimated Value
3. Key Requirements
4. Bid Deadline
5. Relevance Score (0-100) for a small tech consulting firm
6. Recommended Action (Bid/Skip/Monitor)

Contract Text:
${contractText}

Respond in JSON format.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  try {
    return JSON.parse(text);
  } catch {
    return { error: "Failed to parse AI response", rawText: text };
  }
}

export async function generateBid(contractData: any, companyProfile: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const prompt = `You are a professional bid writer. Generate a compelling government contract bid based on:

Contract: ${JSON.stringify(contractData, null, 2)}
Company Profile: ${companyProfile}

Generate a structured bid including:
1. Executive Summary
2. Technical Approach
3. Team Qualifications
4. Pricing Strategy
5. Timeline

Format as professional bid document.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
