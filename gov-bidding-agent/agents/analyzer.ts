import { analyzeContract } from '../lib/gemini';
import type { Contract } from '../scrapers/sam-gov';

export interface AnalyzedContract extends Contract {
  analysis?: {
    contractType: string;
    estimatedValue: string;
    relevanceScore: number;
    recommendedAction: 'Bid' | 'Skip' | 'Monitor';
    keyRequirements: string[];
  };
}

export class AnalyzerAgent {
  async analyzeContracts(contracts: Contract[]): Promise<AnalyzedContract[]> {
    console.log(`🧠 Analyzing ${contracts.length} contracts...`);

    const analyzed: AnalyzedContract[] = [];

    for (const contract of contracts) {
      try {
        const analysis = await analyzeContract(
          `${contract.title}\n\n${contract.description}`
        );

        analyzed.push({
          ...contract,
          analysis: {
            contractType: analysis.contractType || 'Unknown',
            estimatedValue: analysis.estimatedValue || contract.estimatedValue || 'Not specified',
            relevanceScore: analysis.relevanceScore || 50,
            recommendedAction: analysis.recommendedAction || 'Monitor',
            keyRequirements: analysis.keyRequirements || [],
          },
        });

        console.log(`✓ Analyzed: ${contract.title} (Score: ${analysis.relevanceScore})`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error analyzing contract ${contract.id}:`, error);
        analyzed.push(contract);
      }
    }

    return analyzed.sort((a, b) =>
      (b.analysis?.relevanceScore || 0) - (a.analysis?.relevanceScore || 0)
    );
  }
}
