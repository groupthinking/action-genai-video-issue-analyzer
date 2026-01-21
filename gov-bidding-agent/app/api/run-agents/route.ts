import { MonitorAgent } from '@/agents/monitor';
import { AnalyzerAgent } from '@/agents/analyzer';
import { BidderAgent } from '@/agents/bidder';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { searchTerms } = await request.json();

    // Step 1: Monitor for new contracts
    const monitor = new MonitorAgent();
    const contracts = await monitor.start(searchTerms || ['IT services', 'software development']);

    // Step 2: Analyze contracts with AI
    const analyzer = new AnalyzerAgent();
    const analyzedContracts = await analyzer.analyzeContracts(contracts);

    // Step 3: Generate bids for high-value opportunities
    const bidder = new BidderAgent();
    const bids = await bidder.generateBids(analyzedContracts);

    return NextResponse.json({
      success: true,
      summary: {
        contractsFound: contracts.length,
        contractsAnalyzed: analyzedContracts.length,
        bidsGenerated: bids.length,
      },
      contracts: analyzedContracts,
      bids,
    });
  } catch (error) {
    console.error('Agent workflow error:', error);
    return NextResponse.json(
      { error: 'Failed to run agent workflow', details: (error as Error).message },
      { status: 500 }
    );
  }
}
