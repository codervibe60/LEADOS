/**
 * Unified data source aggregator.
 * Fetches from all platforms and returns a consolidated market research payload
 * ready for Claude to analyze.
 */

import { fetchGoogleTrends, TrendsResponse } from './google-trends';
import { fetchRedditSignals, RedditResponse } from './reddit';
import { fetchUpworkSignals, UpworkResponse } from './upwork';
import { fetchLinkedInSignals, LinkedInResponse } from './linkedin';

export interface MarketResearchData {
  googleTrends: TrendsResponse;
  reddit: RedditResponse;
  upwork: UpworkResponse;
  linkedin: LinkedInResponse;
  sourcesUsed: string[];
  fetchedAt: string;
}

/**
 * Research keywords across all platforms.
 * Returns real data when API keys are configured, empty arrays otherwise.
 */
export async function fetchMarketResearch(
  keywords: string[],
  options: {
    region?: string;
    subreddits?: string[];
    skipPlatforms?: string[];
  } = {}
): Promise<MarketResearchData> {
  const { region = 'US', subreddits, skipPlatforms = [] } = options;
  const sourcesUsed: string[] = [];

  // Fetch in parallel for speed
  const [googleTrends, reddit, upwork, linkedin] = await Promise.all([
    skipPlatforms.includes('google_trends')
      ? { source: 'mock' as const, trends: [], timestamp: new Date().toISOString() }
      : fetchGoogleTrends(keywords, region).catch((e) => {
          console.warn('[DataSources] Google Trends failed:', e.message);
          return { source: 'mock' as const, trends: [], timestamp: new Date().toISOString() };
        }),
    skipPlatforms.includes('reddit')
      ? { source: 'mock' as const, signals: [], timestamp: new Date().toISOString() }
      : fetchRedditSignals(keywords, subreddits).catch((e) => {
          console.warn('[DataSources] Reddit failed:', e.message);
          return { source: 'mock' as const, signals: [], timestamp: new Date().toISOString() };
        }),
    skipPlatforms.includes('upwork')
      ? { source: 'mock' as const, signals: [], timestamp: new Date().toISOString() }
      : fetchUpworkSignals(keywords).catch((e) => {
          console.warn('[DataSources] Upwork failed:', e.message);
          return { source: 'mock' as const, signals: [], timestamp: new Date().toISOString() };
        }),
    skipPlatforms.includes('linkedin')
      ? { source: 'mock' as const, signals: [], timestamp: new Date().toISOString() }
      : fetchLinkedInSignals(keywords).catch((e) => {
          console.warn('[DataSources] LinkedIn failed:', e.message);
          return { source: 'mock' as const, signals: [], timestamp: new Date().toISOString() };
        }),
  ]);

  if (googleTrends.source !== 'mock') sourcesUsed.push(`Google Trends (${googleTrends.source})`);
  if (reddit.source !== 'mock') sourcesUsed.push(`Reddit (${reddit.source})`);
  if (upwork.source !== 'mock') sourcesUsed.push(`Upwork (${upwork.source})`);
  if (linkedin.source !== 'mock') sourcesUsed.push(`LinkedIn (${linkedin.source})`);

  return {
    googleTrends,
    reddit,
    upwork,
    linkedin,
    sourcesUsed,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Check which data sources are configured/available.
 */
export function getDataSourceStatus(): Record<string, { configured: boolean; keyHint: string }> {
  return {
    serpapi: {
      configured: !!process.env.SERPAPI_KEY,
      keyHint: 'SERPAPI_KEY — enables Google Trends, Upwork, LinkedIn searches (serpapi.com, 100 free/mo)',
    },
    reddit: {
      configured: !!process.env.REDDIT_CLIENT_ID,
      keyHint: 'REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET — higher rate limits (reddit.com/prefs/apps)',
    },
    anthropic: {
      configured: !!process.env.ANTHROPIC_API_KEY,
      keyHint: 'ANTHROPIC_API_KEY — enables Claude AI analysis (console.anthropic.com)',
    },
  };
}

export { fetchGoogleTrends } from './google-trends';
export { fetchRedditSignals } from './reddit';
export { fetchUpworkSignals } from './upwork';
export { fetchLinkedInSignals } from './linkedin';
