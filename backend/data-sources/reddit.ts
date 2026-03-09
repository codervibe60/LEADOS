/**
 * Reddit data fetcher for market demand signals.
 * Uses Reddit's public JSON API (no auth needed for public subreddits).
 * For higher rate limits, configure REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET.
 */

interface RedditPost {
  title: string;
  subreddit: string;
  score: number;
  numComments: number;
  url: string;
  created: string;
  selftext?: string;
}

interface RedditSignal {
  subreddit: string;
  keyword: string;
  postCount: number;
  avgScore: number;
  avgComments: number;
  topPosts: RedditPost[];
  demandIndicator: 'high' | 'medium' | 'low';
}

interface RedditResponse {
  source: 'authenticated' | 'public' | 'mock';
  signals: RedditSignal[];
  timestamp: string;
}

const REDDIT_CLIENT_ID = () => process.env.REDDIT_CLIENT_ID || '';
const REDDIT_CLIENT_SECRET = () => process.env.REDDIT_CLIENT_SECRET || '';

/**
 * Get OAuth token for Reddit API (higher rate limits).
 */
async function getRedditToken(): Promise<string | null> {
  if (!REDDIT_CLIENT_ID() || !REDDIT_CLIENT_SECRET()) return null;

  try {
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${REDDIT_CLIENT_ID()}:${REDDIT_CLIENT_SECRET()}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (res.ok) {
      const data = await res.json();
      return data.access_token;
    }
  } catch {}
  return null;
}

/**
 * Search a subreddit for posts matching a keyword.
 */
async function searchSubreddit(
  subreddit: string,
  keyword: string,
  token: string | null
): Promise<RedditPost[]> {
  const baseUrl = token
    ? `https://oauth.reddit.com/r/${subreddit}/search.json`
    : `https://www.reddit.com/r/${subreddit}/search.json`;

  const params = new URLSearchParams({
    q: keyword,
    sort: 'relevance',
    t: 'month', // Last month
    limit: '25',
    restrict_sr: 'true',
  });

  const headers: Record<string, string> = {
    'User-Agent': 'LeadOS/1.0 (Market Research Bot)',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}?${params}`, { headers });
  if (!res.ok) throw new Error(`Reddit API error: ${res.status}`);

  const data = await res.json();
  const posts = data?.data?.children || [];

  return posts.map((p: any) => ({
    title: p.data.title,
    subreddit: p.data.subreddit,
    score: p.data.score,
    numComments: p.data.num_comments,
    url: `https://reddit.com${p.data.permalink}`,
    created: new Date(p.data.created_utc * 1000).toISOString(),
    selftext: (p.data.selftext || '').substring(0, 200),
  }));
}

/**
 * Scan multiple subreddits for demand signals around given keywords.
 */
export async function fetchRedditSignals(
  keywords: string[],
  subreddits: string[] = ['entrepreneur', 'SaaS', 'smallbusiness', 'marketing', 'freelance', 'Upwork', 'digital_marketing', 'startups']
): Promise<RedditResponse> {
  const token = await getRedditToken();
  const source = token ? 'authenticated' : 'public';
  const signals: RedditSignal[] = [];

  for (const keyword of keywords) {
    for (const subreddit of subreddits) {
      try {
        const posts = await searchSubreddit(subreddit, keyword, token);

        if (posts.length === 0) continue;

        const avgScore = Math.round(posts.reduce((s, p) => s + p.score, 0) / posts.length);
        const avgComments = Math.round(posts.reduce((s, p) => s + p.numComments, 0) / posts.length);

        // Determine demand level
        let demandIndicator: 'high' | 'medium' | 'low' = 'low';
        if (posts.length >= 10 && avgScore > 50) demandIndicator = 'high';
        else if (posts.length >= 5 || avgScore > 20) demandIndicator = 'medium';

        signals.push({
          subreddit,
          keyword,
          postCount: posts.length,
          avgScore,
          avgComments,
          topPosts: posts.slice(0, 3),
          demandIndicator,
        });

        // Rate limiting — be respectful
        await new Promise((r) => setTimeout(r, token ? 500 : 1500));
      } catch (err: any) {
        console.warn(`[Reddit] Failed to search r/${subreddit} for "${keyword}":`, err.message);
      }
    }
  }

  return {
    source: signals.length > 0 ? source : 'mock',
    signals,
    timestamp: new Date().toISOString(),
  };
}

export type { RedditPost, RedditSignal, RedditResponse };
