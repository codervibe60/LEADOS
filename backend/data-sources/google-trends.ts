/**
 * Google Trends data fetcher via SerpAPI.
 * SerpAPI provides structured Google Trends data (free tier: 100 searches/mo).
 * Fallback: direct Google Trends URL scraping via unofficial endpoint.
 */

interface TrendResult {
  keyword: string;
  interest: number; // 0-100 relative interest
  rising: boolean;
  relatedQueries: string[];
  timeframe: string;
}

interface TrendsResponse {
  source: 'serpapi' | 'direct' | 'mock';
  trends: TrendResult[];
  timestamp: string;
}

const SERPAPI_KEY = () => process.env.SERPAPI_KEY || '';

/**
 * Fetch Google Trends data for given keywords using SerpAPI.
 */
async function fetchViaSerpAPI(keywords: string[], region: string): Promise<TrendResult[]> {
  const results: TrendResult[] = [];

  for (const keyword of keywords) {
    const params = new URLSearchParams({
      engine: 'google_trends',
      q: keyword,
      geo: region,
      date: 'today 3-m', // Last 3 months
      api_key: SERPAPI_KEY(),
    });

    const res = await fetch(`https://serpapi.com/search.json?${params}`);
    if (!res.ok) throw new Error(`SerpAPI error: ${res.status}`);

    const data = await res.json();
    const timelineData = data.interest_over_time?.timeline_data || [];

    // Calculate average interest
    const avgInterest = timelineData.length > 0
      ? Math.round(timelineData.reduce((sum: number, d: any) => sum + (d.values?.[0]?.extracted_value || 0), 0) / timelineData.length)
      : 50;

    // Get related queries
    const risingQueries = (data.related_queries?.rising || []).slice(0, 5).map((q: any) => q.query);
    const topQueries = (data.related_queries?.top || []).slice(0, 5).map((q: any) => q.query);

    results.push({
      keyword,
      interest: avgInterest,
      rising: avgInterest > 60,
      relatedQueries: [...risingQueries, ...topQueries].slice(0, 8),
      timeframe: 'last 3 months',
    });
  }

  return results;
}

/**
 * Fetch via Google Trends direct endpoint (no API key needed, less reliable).
 */
async function fetchDirect(keywords: string[], region: string): Promise<TrendResult[]> {
  const results: TrendResult[] = [];

  for (const keyword of keywords) {
    try {
      // Google Trends multiline explore API
      const encodedKeyword = encodeURIComponent(keyword);
      const url = `https://trends.google.com/trends/api/dailytrends?hl=en-US&tz=-300&geo=${region}&ns=15`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadOS/1.0)' },
      });

      if (res.ok) {
        const text = await res.text();
        // Google Trends prefixes response with ")]}'" — strip it
        const clean = text.replace(/^\)\]\}\'/, '');
        const data = JSON.parse(clean);
        const dailyTrends = data?.default?.trendingSearchesDays?.[0]?.trendingSearches || [];

        // Check if our keyword appears in daily trends
        const match = dailyTrends.find((t: any) =>
          t.title?.query?.toLowerCase().includes(keyword.toLowerCase())
        );

        results.push({
          keyword,
          interest: match ? 85 : 50,
          rising: !!match,
          relatedQueries: dailyTrends.slice(0, 5).map((t: any) => t.title?.query || ''),
          timeframe: 'daily trends',
        });
      } else {
        // Estimate based on keyword characteristics
        results.push({
          keyword,
          interest: 50,
          rising: false,
          relatedQueries: [],
          timeframe: 'estimated',
        });
      }
    } catch {
      results.push({
        keyword,
        interest: 50,
        rising: false,
        relatedQueries: [],
        timeframe: 'error',
      });
    }
  }

  return results;
}

/**
 * Main entry point — tries SerpAPI first, falls back to direct, then mock.
 */
export async function fetchGoogleTrends(
  keywords: string[],
  region: string = 'US'
): Promise<TrendsResponse> {
  // Try SerpAPI first
  if (SERPAPI_KEY()) {
    try {
      const trends = await fetchViaSerpAPI(keywords, region);
      return { source: 'serpapi', trends, timestamp: new Date().toISOString() };
    } catch (err: any) {
      console.warn('[GoogleTrends] SerpAPI failed, falling back to direct:', err.message);
    }
  }

  // Try direct Google Trends
  try {
    const trends = await fetchDirect(keywords, region);
    if (trends.some((t) => t.relatedQueries.length > 0)) {
      return { source: 'direct', trends, timestamp: new Date().toISOString() };
    }
  } catch (err: any) {
    console.warn('[GoogleTrends] Direct fetch failed:', err.message);
  }

  // Return empty — let the caller handle fallback
  return { source: 'mock', trends: [], timestamp: new Date().toISOString() };
}

export type { TrendResult, TrendsResponse };
