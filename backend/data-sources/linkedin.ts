/**
 * LinkedIn market signals fetcher.
 * Uses Google search to find LinkedIn job postings and company signals.
 * Direct LinkedIn API requires OAuth + approved app — this is the practical alternative.
 */

interface LinkedInSignal {
  keyword: string;
  jobPostings: number;
  companyHiring: string[];
  topRoles: { title: string; company: string; url: string }[];
  growthIndicator: 'high' | 'medium' | 'low';
}

interface LinkedInResponse {
  source: 'serpapi' | 'google' | 'mock';
  signals: LinkedInSignal[];
  timestamp: string;
}

const SERPAPI_KEY = () => process.env.SERPAPI_KEY || '';

/**
 * Search LinkedIn job postings via SerpAPI Google Search.
 */
async function searchLinkedInViaSerpAPI(keyword: string): Promise<LinkedInSignal> {
  const params = new URLSearchParams({
    engine: 'google',
    q: `site:linkedin.com/jobs "${keyword}" posted last month`,
    num: '10',
    api_key: SERPAPI_KEY(),
  });

  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) throw new Error(`SerpAPI error: ${res.status}`);

  const data = await res.json();
  const results = data.organic_results || [];

  const topRoles = results.slice(0, 5).map((r: any) => {
    const parts = (r.title || '').split(' - ');
    return {
      title: parts[0]?.trim() || r.title,
      company: parts[1]?.trim() || 'Unknown',
      url: r.link || '',
    };
  });

  const companies = topRoles.map((r: any) => r.company).filter((c: string) => c !== 'Unknown');
  const uniqueCompanies = [...new Set(companies)].slice(0, 5);

  const totalResults = data.search_information?.total_results
    ? parseInt(data.search_information.total_results.replace(/,/g, ''))
    : results.length * 500;

  return {
    keyword,
    jobPostings: Math.min(totalResults, 50000),
    companyHiring: uniqueCompanies as string[],
    topRoles,
    growthIndicator: totalResults > 5000 ? 'high' : totalResults > 1000 ? 'medium' : 'low',
  };
}

/**
 * Search LinkedIn via direct Google (no API key).
 */
async function searchLinkedInDirect(keyword: string): Promise<LinkedInSignal> {
  try {
    const encodedQ = encodeURIComponent(`site:linkedin.com/jobs "${keyword}"`);
    const res = await fetch(`https://www.google.com/search?q=${encodedQ}&num=5`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadOS/1.0)' },
    });

    if (res.ok) {
      const html = await res.text();
      const resultCount = (html.match(/class="g"/g) || []).length;
      return {
        keyword,
        jobPostings: resultCount * 500,
        companyHiring: [],
        topRoles: [],
        growthIndicator: resultCount > 3 ? 'medium' : 'low',
      };
    }
  } catch {}

  return {
    keyword,
    jobPostings: 0,
    companyHiring: [],
    topRoles: [],
    growthIndicator: 'low',
  };
}

/**
 * Main entry — fetch LinkedIn demand signals.
 */
export async function fetchLinkedInSignals(keywords: string[]): Promise<LinkedInResponse> {
  const signals: LinkedInSignal[] = [];

  for (const keyword of keywords) {
    try {
      if (SERPAPI_KEY()) {
        const signal = await searchLinkedInViaSerpAPI(keyword);
        signals.push(signal);
      } else {
        const signal = await searchLinkedInDirect(keyword);
        signals.push(signal);
      }
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err: any) {
      console.warn(`[LinkedIn] Failed for "${keyword}":`, err.message);
    }
  }

  return {
    source: SERPAPI_KEY() ? 'serpapi' : signals.length > 0 ? 'google' : 'mock',
    signals,
    timestamp: new Date().toISOString(),
  };
}

export type { LinkedInSignal, LinkedInResponse };
