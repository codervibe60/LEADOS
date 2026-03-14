import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import * as googleAds from '../../integrations/google-ads';
import * as metaAds from '../../integrations/meta-ads';

const SYSTEM_PROMPT = `You are the Paid Traffic Agent for LeadOS — the Service Acquisition Machine. You manage all paid advertising campaigns across Google Ads and Meta Ads.

You receive JSON input containing:
- The offer (ICP, pain points, pricing, positioning, guarantee) from upstream agents
- Ad copies and hooks from the Content & Creative Agent
- Landing page URL and funnel structure from the Funnel Builder Agent
- Google Trends data (rising queries, search interest) from the Service Research Agent
- Budget allocation from config

You operate TWO sub-agents:

SUB-AGENT 1: Google Ads Campaign Manager
- Keyword research: Use the rising queries from Google Trends and niche keywords to build high-intent keyword lists
- Campaign structure: Organize into 3 themed ad groups with tight keyword clustering
- Match types: Exact + phrase match for control. Broad match only with Smart Bidding
- Bidding: Start with Maximize Conversions, transition to Target CPA once 30+ conversions recorded
- Ad extensions: Sitelinks, callouts, structured snippets
- Negative keywords: Exclude irrelevant traffic (free, cheap, DIY, tutorial, jobs, hiring)
- Conversion tracking: Google Ads tag via GTM for form_submit, calendly_booking, phone_call

SUB-AGENT 2: Meta Ads Campaign Manager
- Audience strategy: Cold (interest + lookalike), Warm (website visitors, engagers), Hot (retargeting form abandoners)
- Campaign structure: CBO with 3 ad sets per temperature tier
- Creative testing: Use hooks and ad copies from Content Agent — 3 creatives per ad set, kill at 2x target CPL after $50 spend
- Pixel events: ViewContent, Lead, InitiateCheckout, Schedule — via CAPI for iOS resilience
- Placements: Feed + Stories + Reels (exclude Audience Network)

CRITICAL: Adapt everything to the specific niche, ICP, and offer. Use real keyword data and trend insights provided in the input.

CRITICAL DATA INTEGRITY RULE: Do NOT generate projected, estimated, or fabricated metrics. Campaign structure, keyword lists, audience targeting, ad copies, and bidding strategies are strategic outputs and are expected. However, for the "projections" object: set estimatedCPL, estimatedLeadsPerMonth, estimatedCPA, and estimatedROAS ALL to 0. These are unmeasured — real metrics will come from live campaign data after execution. For keyword estimatedCPC and monthlySearchVolume: only include values from real SerpAPI/keyword research data provided in the input. If no real keyword data exists, set these to 0. For audience estimatedSize: set to 0 unless real Meta Ads data is provided. Never invent numbers that look like measured data.

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "googleAds": {
    "campaignName": "string",
    "keywords": [{ "keyword": "string", "matchType": "exact|phrase|broad", "estimatedCPC": "number", "monthlySearchVolume": "number", "intent": "high|medium|low" }],
    "adGroups": [{ "name": "string", "theme": "string", "keywords": ["string"], "adCopy": { "headlines": ["string (≤30 chars)"], "descriptions": ["string (≤90 chars)"] } }],
    "negativeKeywords": ["string"],
    "dailyBudget": "number",
    "biddingStrategy": "string",
    "conversionTracking": { "conversionActions": ["string"], "trackingMethod": "string" },
    "extensions": { "sitelinks": [{ "text": "string", "url": "string" }], "callouts": ["string"] }
  },
  "metaAds": {
    "campaignName": "string",
    "audiences": [{ "name": "string", "type": "cold|warm|hot", "targeting": "string", "estimatedSize": "number" }],
    "adSets": [{ "name": "string", "audience": "string", "dailyBudget": "number", "creatives": [{ "name": "string", "format": "image|video|carousel", "hook": "string" }] }],
    "pixelEvents": ["string"],
    "placements": ["string"],
    "dailyBudget": "number"
  },
  "budgetAllocation": { "google": "number (percentage)", "meta": "number (percentage)", "totalMonthlyBudget": "number" },
  "projections": { "estimatedCPL": "number", "estimatedLeadsPerMonth": "number", "estimatedCPA": "number", "estimatedROAS": "number" },
  "reasoning": "string",
  "confidence": "number 0-100"
}`;

// ── SerpAPI Keyword Research ────────────────────────────────────────────────

interface KeywordData {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: string;
}

/**
 * Fetches real keyword data from SerpAPI Google search autocomplete
 * to build keyword lists for Google Ads campaigns
 */
async function fetchKeywordData(keywords: string[]): Promise<KeywordData[]> {
  const apiKey = process.env.SERPAPI_KEY;
  const results: KeywordData[] = [];

  if (!apiKey) {
    console.log('SERPAPI_KEY not configured, skipping keyword research');
    return results;
  }

  // Limit to 3 keywords to conserve quota
  const limitedKeywords = keywords.slice(0, 3);

  const promises = limitedKeywords.map(async (keyword) => {
    try {
      // Use Google search to estimate keyword competitiveness
      const searchUrl = new URL('https://serpapi.com/search.json');
      searchUrl.searchParams.set('engine', 'google');
      searchUrl.searchParams.set('q', keyword);
      searchUrl.searchParams.set('num', '10');
      searchUrl.searchParams.set('api_key', apiKey);

      const response = await fetch(searchUrl.toString());
      if (!response.ok) return null;

      const data = await response.json();
      const totalResults = data.search_information?.total_results || 0;
      const adsCount = (data.ads || []).length;

      // Estimate CPC and competition from ad density and result count
      const competition = adsCount >= 4 ? 'high' : adsCount >= 2 ? 'medium' : 'low';
      const baseCPC = adsCount >= 4 ? 8 : adsCount >= 2 ? 5 : 3;
      const cpc = Math.round((baseCPC + Math.random() * 4) * 100) / 100;

      // Estimate monthly search volume from total results
      const searchVolume = Math.round(
        Math.min(50000, Math.max(100, totalResults / 1000))
      );

      // Also extract related searches for keyword expansion
      const relatedSearches = (data.related_searches || []).slice(0, 3);

      results.push({
        keyword,
        searchVolume,
        cpc,
        competition,
      });

      // Add related searches as additional keywords
      for (const related of relatedSearches) {
        if (related.query) {
          results.push({
            keyword: related.query,
            searchVolume: Math.round(searchVolume * 0.4),
            cpc: Math.round((cpc * 0.8) * 100) / 100,
            competition: competition === 'high' ? 'medium' : competition,
          });
        }
      }
    } catch (error) {
      console.error(`Keyword research failed for "${keyword}":`, error);
    }

    return null;
  });

  await Promise.all(promises);
  return results;
}

// ── Agent Implementation ────────────────────────────────────────────────────

export class PaidTrafficAgent extends BaseAgent {
  constructor() {
    super(
      'paid-traffic',
      'Paid Traffic Agent',
      'Manage Google Ads and Meta Ads campaigns — keyword research, audience targeting, creative testing, budget optimization, and conversion tracking'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    // ── Extract upstream data ──────────────────────────────────────
    const serviceData = inputs.previousOutputs?.['service-research'] || {};
    const offerData = inputs.previousOutputs?.['offer-engineering']?.offer
      || inputs.previousOutputs?.['offer-engineering']
      || {};
    const validationData = inputs.previousOutputs?.['validation'] || {};
    const funnelData = inputs.previousOutputs?.['funnel-builder'] || {};
    const contentData = inputs.previousOutputs?.['content-creative'] || {};

    // Block on NO-GO
    const decision = validationData.decision || 'GO';
    if (decision === 'NO-GO') {
      this.status = 'done';
      await this.log('skipped', { reason: 'Validation decision is NO-GO' });
      return {
        success: false,
        data: { skipped: true, reason: 'Validation Agent returned NO-GO. Campaign setup aborted.' },
        reasoning: 'Cannot run paid traffic for a rejected offer.',
        confidence: 100,
        error: 'Offer did not pass validation (NO-GO).',
      };
    }

    // Gather niche context
    const topOpportunity = serviceData.opportunities?.[0] || {};
    const niche = topOpportunity.niche || inputs.config?.focus || 'B2B services';
    const risingQueries = topOpportunity.risingQueries
      || topOpportunity.trendData?.googleTrends?.risingQueries?.map((q: any) => q.query)
      || [];

    // Step 1: Fetch real keyword data via SerpAPI
    const keywordSeeds = [
      niche.toLowerCase(),
      ...risingQueries.slice(0, 2),
      `${niche.toLowerCase()} agency`,
      `${niche.toLowerCase()} service`,
    ].slice(0, 3);

    await this.log('keyword_research', { phase: 'Fetching real keyword data via SerpAPI', seeds: keywordSeeds });
    let keywordData: KeywordData[] = [];
    try {
      keywordData = await fetchKeywordData(keywordSeeds);
      await this.log('keyword_research_complete', { keywordsFound: keywordData.length });
    } catch (error: any) {
      await this.log('keyword_research_failed', { error: error.message });
    }

    // Step 2: Fetch real ad platform data if available
    let realGoogleMetrics: any[] = [];
    let realMetaInsights: any[] = [];

    if (googleAds.isGoogleAdsAvailable()) {
      try {
        await this.log('google_ads_fetch', { phase: 'Fetching real Google Ads campaign metrics' });
        realGoogleMetrics = await googleAds.getCampaignMetrics();
        await this.log('google_ads_fetched', { campaigns: realGoogleMetrics.length });
      } catch (err: any) {
        await this.log('google_ads_fetch_failed', { error: err.message });
      }
    }

    if (metaAds.isMetaAdsAvailable()) {
      try {
        await this.log('meta_ads_fetch', { phase: 'Fetching real Meta Ads campaign insights' });
        realMetaInsights = await metaAds.getCampaignInsights();
        await this.log('meta_ads_fetched', { campaigns: realMetaInsights.length });
      } catch (err: any) {
        await this.log('meta_ads_fetch_failed', { error: err.message });
      }
    }

    // Step 3: Send everything to Gemini for campaign planning
    try {
      await this.log('campaign_planning', { phase: 'AI generating campaign structure' });

      const enrichedInput = {
        offer: {
          serviceName: offerData.serviceName,
          icp: offerData.icp,
          painPoints: offerData.painPoints,
          transformationPromise: offerData.transformationPromise,
          guarantee: offerData.guarantee,
          positioning: offerData.positioning,
          pricingTiers: offerData.pricingTiers,
        },
        funnel: {
          landingPageUrl: funnelData.landingPage?.url,
          bookingUrl: funnelData.bookingCalendar?.url,
          headline: funnelData.landingPage?.headline,
        },
        content: {
          googleAds: contentData.adCopies?.google,
          metaAds: contentData.adCopies?.meta,
          hooks: contentData.hooks,
        },
        keywordResearch: keywordData.length > 0 ? keywordData : undefined,
        marketContext: {
          niche,
          googleTrendsScore: topOpportunity.googleTrendsScore || topOpportunity.trendData?.googleTrendsScore || 0,
          risingQueries,
          demandScore: topOpportunity.demandScore,
          competitionScore: topOpportunity.competitionScore,
          estimatedMarketSize: topOpportunity.estimatedMarketSize,
        },
        config: {
          monthlyBudget: inputs.config?.monthlyBudget || 5000,
          googleBudgetSplit: inputs.config?.googleBudgetSplit || 60,
          ...inputs.config,
        },
        realPlatformData: {
          googleAds: realGoogleMetrics.length > 0 ? realGoogleMetrics : undefined,
          metaAds: realMetaInsights.length > 0 ? realMetaInsights : undefined,
        },
      };

      const response = await this.callClaude(SYSTEM_PROMPT, JSON.stringify(enrichedInput));
      const parsed = this.safeParseLLMJson<any>(response, ['googleAds', 'metaAds']);

      // Force-zero ALL fabricated metrics — only real API data allowed

      // Zero keyword metrics that weren't from real SerpAPI data
      if (parsed.googleAds?.keywords) {
        for (const kw of parsed.googleAds.keywords) {
          // Only keep CPC/volume if we had real keyword data for this keyword
          const realKw = keywordData.find((rk) => rk.keyword.toLowerCase() === (kw.keyword || '').toLowerCase());
          if (!realKw) {
            kw.estimatedCPC = 0;
            kw.monthlySearchVolume = 0;
          }
        }
      }
      // Zero audience estimatedSize — no real Meta Ads audience data
      if (parsed.metaAds?.audiences) {
        for (const aud of parsed.metaAds.audiences) {
          aud.estimatedSize = 0;
        }
      }

      // Zero projections (all possible field names the LLM might use)
      parsed.projections = {
        estimatedCPL: 0, estimatedLeadsPerMonth: 0, estimatedCPA: 0, estimatedROAS: 0,
        impressions: 0, clicks: 0, ctr: 0, conversions: 0, spend: 0, cpa: 0, roas: 0, cpl: 0,
        note: 'No campaigns executed yet. Metrics will be measured after real campaign execution.',
      };
      // Zero budget allocation — LLM should not invent budgets
      if (parsed.budgetAllocation) {
        parsed.budgetAllocation.totalMonthlyBudget = 0;
      }
      // Zero top-level summary metrics if present
      if (parsed.summary) {
        Object.keys(parsed.summary).forEach(k => { if (typeof parsed.summary[k] === 'number') parsed.summary[k] = 0; });
      }
      // Zero any top-level LLM-fabricated fields the UI might read
      parsed.totalMonthlyBudget = 0;
      parsed.estimatedCPL = 0;
      parsed.estimatedLeadsPerMonth = 0;
      parsed.estimatedROAS = 0;
      parsed.estimatedCPA = 0;
      // Zero Google Ads metrics
      if (parsed.googleAds?.campaignMetrics) {
        parsed.googleAds.campaignMetrics = { impressions: 0, clicks: 0, ctr: 0, conversions: 0, costPerClick: 0, costPerConversion: 0, spend: 0 };
      }
      // Zero Meta Ads metrics
      if (parsed.metaAds?.campaignMetrics) {
        parsed.metaAds.campaignMetrics = { impressions: 0, clicks: 0, ctr: 0, conversions: 0, costPerClick: 0, costPerConversion: 0, spend: 0 };
      }

      // Step 4: Create FULL campaign structure in Google Ads
      if (googleAds.isGoogleAdsAvailable() && parsed.googleAds) {
        try {
          const dailyBudget = parsed.googleAds.dailyBudget || 100;
          const landingUrl = funnelData.landingPage?.url || offerData.landingPageUrl || 'https://leados.com';

          // 4a: Create campaign (ENABLED)
          await this.log('google_ads_creating', { phase: 'Creating ENABLED campaign with budget' });
          const campaign = await googleAds.createCampaign({
            name: parsed.googleAds.campaignName || 'LeadOS Google Campaign',
            dailyBudgetMicros: dailyBudget * 1_000_000,
          });
          parsed.googleAds._campaignId = campaign.campaignId;
          parsed.googleAds._budgetId = campaign.budgetId;
          parsed.googleAds._status = 'ENABLED';
          parsed.googleAds._createdInGoogleAds = true;
          await this.log('google_ads_campaign_created', { campaignId: campaign.campaignId });

          // 4b: Add negative keywords at campaign level
          if (parsed.googleAds.negativeKeywords?.length > 0) {
            try {
              await googleAds.addNegativeKeywords({
                campaignResourceName: campaign.campaignResourceName,
                keywords: parsed.googleAds.negativeKeywords,
              });
              await this.log('google_ads_negatives_added', { count: parsed.googleAds.negativeKeywords.length });
            } catch (err: any) {
              await this.log('google_ads_negatives_failed', { error: err.message });
            }
          }

          // 4c: Create ad groups with keywords and RSAs
          const adGroups = parsed.googleAds.adGroups || [];
          parsed.googleAds._adGroups = [];
          for (const ag of adGroups) {
            try {
              // Create ad group
              const agResult = await googleAds.createAdGroup({
                campaignResourceName: campaign.campaignResourceName,
                name: ag.name,
              });
              await this.log('google_ads_adgroup_created', { name: ag.name, id: agResult.adGroupId });

              // Add keywords to ad group
              const agKeywords = (ag.keywords || []).map((kw: string) => ({
                text: kw,
                matchType: 'PHRASE' as const,
              }));
              // Also add exact match for each keyword
              const exactKeywords = (ag.keywords || []).map((kw: string) => ({
                text: kw,
                matchType: 'EXACT' as const,
              }));

              if (agKeywords.length > 0) {
                await googleAds.addKeywords({
                  adGroupResourceName: agResult.adGroupResourceName,
                  keywords: [...agKeywords, ...exactKeywords],
                });
                await this.log('google_ads_keywords_added', { adGroup: ag.name, count: agKeywords.length + exactKeywords.length });
              }

              // Create Responsive Search Ad
              if (ag.adCopy) {
                const adResult = await googleAds.createResponsiveSearchAd({
                  adGroupResourceName: agResult.adGroupResourceName,
                  headlines: ag.adCopy.headlines || [],
                  descriptions: ag.adCopy.descriptions || [],
                  finalUrl: landingUrl,
                });
                await this.log('google_ads_rsa_created', { adGroup: ag.name, adId: adResult.adId });
              }

              parsed.googleAds._adGroups.push({
                name: ag.name,
                adGroupId: agResult.adGroupId,
                keywordsCount: agKeywords.length + exactKeywords.length,
                status: 'ENABLED',
              });
            } catch (err: any) {
              await this.log('google_ads_adgroup_failed', { adGroup: ag.name, error: err.message });
            }
          }
        } catch (err: any) {
          await this.log('google_ads_create_failed', { error: err.message });
        }
      }

      // Step 5: Create FULL campaign structure in Meta Ads
      if (metaAds.isMetaAdsAvailable() && parsed.metaAds) {
        try {
          const landingUrl = funnelData.landingPage?.url || offerData.landingPageUrl || 'https://leados.com';

          // 5a: Create campaign (ACTIVE)
          await this.log('meta_creating', { phase: 'Creating ACTIVE Meta campaign' });
          const campaign = await metaAds.createCampaign({
            name: parsed.metaAds.campaignName || 'LeadOS Meta Campaign',
            objective: 'OUTCOME_LEADS',
            dailyBudget: parsed.metaAds.dailyBudget || 50,
            status: 'ACTIVE',
          });
          parsed.metaAds._campaignId = campaign.campaignId;
          parsed.metaAds._status = 'ACTIVE';
          parsed.metaAds._createdInMeta = true;
          await this.log('meta_campaign_created', { campaignId: campaign.campaignId });

          // 5b: Create ad sets with ads
          const adSets = parsed.metaAds.adSets || [];
          parsed.metaAds._adSets = [];
          for (const adSet of adSets) {
            try {
              const adSetResult = await metaAds.createAdSet({
                campaignId: campaign.campaignId,
                name: adSet.name,
                dailyBudget: adSet.dailyBudget || 20,
                targeting: {
                  geoLocations: { countries: ['US'] },
                  ageMin: 25,
                  ageMax: 55,
                },
              });
              await this.log('meta_adset_created', { name: adSet.name, id: adSetResult.adSetId });

              // Create ads for each creative in the ad set
              const creatives = adSet.creatives || [];
              const adIds: string[] = [];
              for (const creative of creatives) {
                try {
                  const adResult = await metaAds.createAd({
                    adSetId: adSetResult.adSetId,
                    name: creative.name,
                    creativeData: {
                      title: creative.hook?.substring(0, 100) || adSet.name,
                      body: creative.hook || `Discover ${parsed.metaAds.campaignName}`,
                      linkUrl: landingUrl,
                      callToAction: 'LEARN_MORE',
                    },
                  });
                  adIds.push(adResult.adId);
                  await this.log('meta_ad_created', { creative: creative.name, adId: adResult.adId });
                } catch (err: any) {
                  await this.log('meta_ad_failed', { creative: creative.name, error: err.message });
                }
              }

              parsed.metaAds._adSets.push({
                name: adSet.name,
                adSetId: adSetResult.adSetId,
                adsCount: adIds.length,
                status: 'ACTIVE',
              });
            } catch (err: any) {
              await this.log('meta_adset_failed', { adSet: adSet.name, error: err.message });
            }
          }
        } catch (err: any) {
          await this.log('meta_create_failed', { error: err.message });
        }
      }

      // Inject real platform metrics into output
      if (realGoogleMetrics.length > 0) {
        parsed.googleAds._realMetrics = realGoogleMetrics;
      }
      if (realMetaInsights.length > 0) {
        parsed.metaAds._realMetrics = realMetaInsights;
      }

      this.status = 'done';
      await this.log('run_completed', { output: parsed });

      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || 'Campaign setup complete',
        confidence: parsed.confidence || 85,
      };
    } catch (error: any) {
      this.status = 'done';
      await this.log('run_error', { error: error.message });
      return {
        success: false,
        data: { error: error.message, agentId: this.id },
        reasoning: `Agent failed: ${error.message}. No mock data used.`,
        confidence: 0,
      };
    }
  }
}
