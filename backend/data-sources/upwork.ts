/**
 * Upwork/freelance market data fetcher.
 * Uses Google search (via SerpAPI) to find Upwork job postings for demand signals.
 * No direct Upwork API needed — we scrape Google search results.
 */

interface UpworkSignal {
  keyword: string;
  jobCount: number;
  avgBudget: string;
  topJobs: { title: string; budget: string; url: string }[];
  demandLevel: 'high' | 'medium' | 'low';
}

interface UpworkResponse {
  source: 'serpapi' | 'google' | 'mock';
  signals: UpworkSignal[];
  timestamp: string;
}

const SERPAPI_KEY = () => process.env.SERPAPI_KEY || '';

/**
 * Search for Upwork job postings via SerpAPI Google Search.
 */
async function searchUpworkViaSerpAPI(keyword: string): Promise<UpworkSignal> {
  const params = new URLSearchParams({
    engine: 'google',
    q: `site:upwork.com/freelance-jobs "${keyword}" jobs`,
    num: '10',
    api_key: SERPAPI_KEY(),
  });

  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) throw new Error(`SerpAPI error: ${res.status}`);

  const data = await res.json();
  const results = data.organic_results || [];

  const topJobs = results.slice(0, 5).map((r: any) => ({
    title: r.title?.replace(' | Upwork', '') || '',
    budget: extractBudget(r.snippet || ''),
    url: r.link || '',
  }));

  const jobCount = data.search_information?.total_results
    ? Math.min(parseInt(data.search_information.total_results.replace(/,/g, '')), 10000)
    : results.length * 100;

  return {
    keyword,
    jobCount,
    avgBudget: topJobs[0]?.budget || '$500-$2000',
    topJobs,
    demandLevel: jobCount > 1000 ? 'high' : jobCount > 200 ? 'medium' : 'low',
  };
}

/**
 * Search Upwork directly via Google (no API key needed, less reliable).
 */
async function searchUpworkDirect(keyword: string): Promise<UpworkSignal> {
  try {
    const encodedQ = encodeURIComponent(`site:upwork.com "${keyword}" freelance`);
    const res = await fetch(`https://www.google.com/search?q=${encodedQ}&num=5`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadOS/1.0)' },
    });

    if (res.ok) {
      const html = await res.text();
      // Count result snippets as a rough indicator
      const resultCount = (html.match(/class="g"/g) || []).length;
      return {
        keyword,
        jobCount: resultCount * 200, // rough estimate
        avgBudget: '$500-$2000',
        topJobs: [],
        demandLevel: resultCount > 3 ? 'medium' : 'low',
      };
    }
  } catch {}

  return {
    keyword,
    jobCount: 0,
    avgBudget: 'N/A',
    topJobs: [],
    demandLevel: 'low',
  };
}

function extractBudget(text: string): string {
  const match = text.match(/\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?/);
  return match ? match[0] : '$500-$2000';
}

/**
 * Main entry — fetch Upwork demand signals for keywords.
 */
export async function fetchUpworkSignals(keywords: string[]): Promise<UpworkResponse> {
  const signals: UpworkSignal[] = [];

  for (const keyword of keywords) {
    try {
      if (SERPAPI_KEY()) {
        const signal = await searchUpworkViaSerpAPI(keyword);
        signals.push(signal);
      } else {
        const signal = await searchUpworkDirect(keyword);
        signals.push(signal);
      }
      // Rate limiting
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err: any) {
      console.warn(`[Upwork] Failed for "${keyword}":`, err.message);
    }
  }

  return {
    source: SERPAPI_KEY() ? 'serpapi' : signals.length > 0 ? 'google' : 'mock',
    signals,
    timestamp: new Date().toISOString(),
  };
}

export type { UpworkSignal, UpworkResponse };
