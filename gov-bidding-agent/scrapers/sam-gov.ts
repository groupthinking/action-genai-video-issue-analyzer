import { chromium } from 'playwright';

export interface Contract {
  id: string;
  title: string;
  description: string;
  agency: string;
  postedDate: string;
  deadline: string;
  estimatedValue?: string;
  url: string;
}

export async function scrapeSAMGov(searchTerm: string = "IT services"): Promise<Contract[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to SAM.gov contract opportunities
    await page.goto('https://sam.gov/search/?index=opp&page=1');

    // Wait for search input
    await page.waitForSelector('input[type="search"]', { timeout: 10000 });

    // Enter search term
    await page.fill('input[type="search"]', searchTerm);
    await page.press('input[type="search"]', 'Enter');

    // Wait for results
    await page.waitForTimeout(3000);

    // Extract contract data
    const contracts: Contract[] = await page.evaluate(() => {
      const results: Contract[] = [];
      const items = document.querySelectorAll('[data-testid="opportunity-card"]');

      items.forEach((item, index) => {
        const titleEl = item.querySelector('h3, h4, .title');
        const agencyEl = item.querySelector('[data-testid="agency-name"]');
        const dateEl = item.querySelector('[data-testid="posted-date"]');
        const linkEl = item.querySelector('a[href*="/opp/"]');

        if (titleEl && linkEl) {
          results.push({
            id: `sam-${Date.now()}-${index}`,
            title: titleEl.textContent?.trim() || 'Unknown Title',
            description: item.textContent?.substring(0, 500) || '',
            agency: agencyEl?.textContent?.trim() || 'Unknown Agency',
            postedDate: dateEl?.textContent?.trim() || new Date().toISOString(),
            deadline: 'TBD',
            url: (linkEl as HTMLAnchorElement).href,
          });
        }
      });

      return results;
    });

    await browser.close();
    return contracts.slice(0, 10); // Return top 10

  } catch (error) {
    console.error('SAM.gov scraping error:', error);
    await browser.close();

    // Return mock data for development
    return [
      {
        id: 'mock-1',
        title: 'IT Infrastructure Modernization Services',
        description: 'The Department of Defense seeks qualified vendors for cloud migration and infrastructure modernization...',
        agency: 'Department of Defense',
        postedDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedValue: '$500,000 - $2,000,000',
        url: 'https://sam.gov/opp/mock-1',
      },
      {
        id: 'mock-2',
        title: 'Cybersecurity Assessment and Compliance',
        description: 'Federal agency requires comprehensive cybersecurity assessment and NIST compliance implementation...',
        agency: 'General Services Administration',
        postedDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedValue: '$250,000 - $750,000',
        url: 'https://sam.gov/opp/mock-2',
      },
    ];
  }
}
