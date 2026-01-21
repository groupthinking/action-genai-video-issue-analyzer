import { scrapeSAMGov, type Contract } from '../scrapers/sam-gov';

export class MonitorAgent {
  private isRunning = false;
  private contracts: Contract[] = [];

  async start(searchTerms: string[] = ['IT services', 'software development']) {
    this.isRunning = true;
    console.log('🔍 Monitor Agent started...');

    for (const term of searchTerms) {
      if (!this.isRunning) break;

      console.log(`Searching for: ${term}`);
      const newContracts = await scrapeSAMGov(term);

      // Filter out duplicates
      const uniqueContracts = newContracts.filter(
        nc => !this.contracts.some(c => c.id === nc.id)
      );

      this.contracts.push(...uniqueContracts);
      console.log(`Found ${uniqueContracts.length} new contracts`);

      // Wait between searches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return this.contracts;
  }

  stop() {
    this.isRunning = false;
    console.log('🛑 Monitor Agent stopped');
  }

  getContracts() {
    return this.contracts;
  }
}
