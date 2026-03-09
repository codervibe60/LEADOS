import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { fetchMarketResearch, MarketResearchData } from '../../data-sources';

const SYSTEM_PROMPT = `You are the Service Research Agent for LeadOS. Your job is to discover high-demand service opportunities by analyzing REAL market data from multiple platforms.

You will receive actual data from Google Trends, Reddit, Upwork, and LinkedIn. Analyze this real data to identify the top service opportunities.

Return ONLY valid JSON output (no markdown, no explanation outside JSON) with this structure:
{
  "opportunities": [
    {
      "niche": "string - service niche name",
      "demandScore": "number 0-100 (based on real signals)",
      "competitionScore": "number 0-100 (lower is better)",
      "monetizationScore": "number 0-100",
      "reasoning": "string - cite specific data points from the research",
      "estimatedMarketSize": "string",
      "targetPlatforms": ["string"],
      "dataSourcesCited": ["string - which platforms confirmed this signal"]
    }
  ],
  "reasoning": "string - overall analysis with specific numbers from the data",
  "confidence": "number 0-100",
  "dataSources": ["string - list of actual sources used"]
}

Rank opportunities by composite score: (demandScore * 0.4) + ((100 - competitionScore) * 0.3) + (monetizationScore * 0.3).
Return top 5 opportunities. ALWAYS cite specific data points (post counts, interest scores, job numbers) in your reasoning.`;

const RESEARCH_KEYWORDS = [
  'AI content marketing agency',
  'B2B lead generation service',
  'SaaS onboarding consulting',
  'ecommerce conversion optimization',
  'LinkedIn outreach automation',
  'paid media management',
  'AI chatbot development',
  'SEO agency',
  'cold email outreach service',
  'marketing automation consulting',
];

export class ServiceResearchAgent extends BaseAgent {
  constructor() {
    super('service-research', 'Service Research Agent', 'Discover high-demand service opportunities via Google Trends, Reddit, LinkedIn, Upwork');
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    try {
      // Step 1: Fetch real market data from all platforms
      const keywords = inputs.config?.keywords || RESEARCH_KEYWORDS;
      const region = inputs.config?.region || 'US';

      await this.log('fetching_data', { keywords: keywords.length, platforms: 4 });

      const marketData = await fetchMarketResearch(keywords, { region });

      await this.log('data_fetched', {
        sourcesUsed: marketData.sourcesUsed,
        trendResults: marketData.googleTrends.trends.length,
        redditSignals: marketData.reddit.signals.length,
        upworkSignals: marketData.upwork.signals.length,
        linkedinSignals: marketData.linkedin.signals.length,
      });

      // Step 2: If we got real data, send it to Claude for analysis
      const hasRealData = marketData.sourcesUsed.length > 0;

      if (hasRealData) {
        const researchPayload = this.buildResearchPayload(marketData);

        const response = await this.callClaude(SYSTEM_PROMPT, researchPayload);
        const parsed = this.parseLLMJson<any>(response);

        this.status = 'done';
        await this.log('run_completed', { output: parsed, dataMode: 'live' });

        return {
          success: true,
          data: {
            ...parsed,
            _metadata: {
              dataMode: 'live',
              sourcesUsed: marketData.sourcesUsed,
              fetchedAt: marketData.fetchedAt,
              keywordsSearched: keywords.length,
            },
          },
          reasoning: parsed.reasoning || 'Analysis complete with live market data',
          confidence: parsed.confidence || 85,
        };
      }

      // Step 3: No real data available — try Claude with general knowledge
      const response = await this.callClaude(SYSTEM_PROMPT, JSON.stringify({
        note: 'No live data sources configured. Use your training knowledge to identify current high-demand B2B service opportunities.',
        focus: inputs.config?.focus || 'B2B services',
        region,
        currentDate: new Date().toISOString().split('T')[0],
      }));

      // If Claude is available, use its response
      if (!response.includes('Mock response')) {
        const parsed = this.parseLLMJson<any>(response);
        this.status = 'done';
        await this.log('run_completed', { output: parsed, dataMode: 'claude_only' });

        return {
          success: true,
          data: {
            ...parsed,
            _metadata: {
              dataMode: 'claude_only',
              sourcesUsed: ['Claude AI (general knowledge)'],
              fetchedAt: new Date().toISOString(),
            },
          },
          reasoning: parsed.reasoning || 'Analysis based on Claude AI knowledge',
          confidence: Math.min(parsed.confidence || 75, 75), // Cap confidence without real data
        };
      }

      // Step 4: Nothing available — return mock with clear indicator
      throw new Error('No data sources or AI available');
    } catch (error: any) {
      this.status = 'error';
      await this.log('run_error', { error: error.message });

      return {
        success: true,
        data: {
          opportunities: [
            { niche: 'AI-Powered Content Marketing', demandScore: 92, competitionScore: 45, monetizationScore: 88, reasoning: 'Explosive demand for AI content with low agency competition', estimatedMarketSize: '$4.2B', targetPlatforms: ['LinkedIn', 'Google Ads'], dataSourcesCited: ['mock'] },
            { niche: 'Shopify Store CRO Consulting', demandScore: 85, competitionScore: 62, monetizationScore: 79, reasoning: 'Growing e-commerce with high willingness to pay', estimatedMarketSize: '$2.8B', targetPlatforms: ['Reddit', 'Upwork'], dataSourcesCited: ['mock'] },
            { niche: 'B2B LinkedIn Lead Generation', demandScore: 88, competitionScore: 55, monetizationScore: 84, reasoning: 'Strong demand from B2B companies seeking qualified leads', estimatedMarketSize: '$3.1B', targetPlatforms: ['LinkedIn'], dataSourcesCited: ['mock'] },
            { niche: 'SaaS Onboarding Optimization', demandScore: 78, competitionScore: 38, monetizationScore: 91, reasoning: 'Niche market with very high LTV and low competition', estimatedMarketSize: '$1.5B', targetPlatforms: ['Google Trends'], dataSourcesCited: ['mock'] },
            { niche: 'Paid Media for DTC Brands', demandScore: 90, competitionScore: 72, monetizationScore: 82, reasoning: 'High volume demand, specialization provides edge', estimatedMarketSize: '$5.6B', targetPlatforms: ['Meta', 'Google Ads'], dataSourcesCited: ['mock'] },
          ],
          _metadata: {
            dataMode: 'mock',
            sourcesUsed: [],
            note: 'Configure SERPAPI_KEY, REDDIT_CLIENT_ID, and ANTHROPIC_API_KEY in .env for live data',
          },
        },
        reasoning: 'Using mock data — configure API keys in Settings for live market research.',
        confidence: 60,
      };
    }
  }

  /**
   * Build a comprehensive research payload from all data sources for Claude to analyze.
   */
  private buildResearchPayload(data: MarketResearchData): string {
    const payload: any = {
      instructions: 'Analyze the following REAL market data and identify the top 5 service opportunities. Cite specific numbers.',
      dataSources: data.sourcesUsed,
      fetchedAt: data.fetchedAt,
    };

    // Google Trends data
    if (data.googleTrends.trends.length > 0) {
      payload.googleTrends = data.googleTrends.trends.map((t) => ({
        keyword: t.keyword,
        interestScore: t.interest,
        rising: t.rising,
        relatedQueries: t.relatedQueries,
      }));
    }

    // Reddit signals
    if (data.reddit.signals.length > 0) {
      payload.redditSignals = data.reddit.signals.map((s) => ({
        keyword: s.keyword,
        subreddit: s.subreddit,
        postCount: s.postCount,
        avgScore: s.avgScore,
        avgComments: s.avgComments,
        demand: s.demandIndicator,
        topPostTitles: s.topPosts.map((p) => p.title),
      }));
    }

    // Upwork signals
    if (data.upwork.signals.length > 0) {
      payload.upworkDemand = data.upwork.signals.map((s) => ({
        keyword: s.keyword,
        jobCount: s.jobCount,
        avgBudget: s.avgBudget,
        demandLevel: s.demandLevel,
        topJobTitles: s.topJobs.map((j) => j.title),
      }));
    }

    // LinkedIn signals
    if (data.linkedin.signals.length > 0) {
      payload.linkedinSignals = data.linkedin.signals.map((s) => ({
        keyword: s.keyword,
        jobPostings: s.jobPostings,
        companiesHiring: s.companyHiring,
        growthIndicator: s.growthIndicator,
      }));
    }

    return JSON.stringify(payload, null, 2);
  }
}
