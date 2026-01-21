import { generateBid } from '../lib/gemini';
import type { AnalyzedContract } from './analyzer';

export interface GeneratedBid {
  contractId: string;
  bidDocument: string;
  generatedAt: string;
  status: 'draft' | 'submitted' | 'won' | 'lost';
}

export class BidderAgent {
  private companyProfile = `
    Tech Solutions Inc.
    - Specialization: Cloud Infrastructure, Cybersecurity, Software Development
    - Team Size: 15 engineers
    - Certifications: ISO 27001, SOC 2, FedRAMP Ready
    - Past Performance: 5 successful federal contracts, $3M total value
    - Key Differentiators: Rapid deployment, veteran-owned, security-first approach
  `;

  async generateBids(contracts: AnalyzedContract[]): Promise<GeneratedBid[]> {
    console.log(`📝 Generating bids for ${contracts.length} contracts...`);

    const bids: GeneratedBid[] = [];

    // Only bid on high-relevance contracts
    const highValueContracts = contracts.filter(
      c => (c.analysis?.relevanceScore || 0) >= 70 && c.analysis?.recommendedAction === 'Bid'
    );

    for (const contract of highValueContracts) {
      try {
        const bidDocument = await generateBid(contract, this.companyProfile);

        bids.push({
          contractId: contract.id,
          bidDocument,
          generatedAt: new Date().toISOString(),
          status: 'draft',
        });

        console.log(`✓ Generated bid for: ${contract.title}`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Error generating bid for ${contract.id}:`, error);
      }
    }

    return bids;
  }

  setCompanyProfile(profile: string) {
    this.companyProfile = profile;
  }
}
