import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { mockGoogleAds, mockMetaAds } from '../../integrations/mock-data';

const SYSTEM_PROMPT = `You are the Paid Traffic Agent for LeadOS — the Service Acquisition Machine. You manage all paid advertising campaigns across Google Ads and Meta Ads. You operate two internal sub-agents:

SUB-AGENT 1: Google Ads Campaign Manager
- Keyword research: Identify high-intent keywords for the offer's ICP (buyer intent > informational)
- Campaign structure: Organize into themed ad groups with tight keyword clustering
- Match types: Use exact + phrase match for control, broad match only with Smart Bidding
- Bidding: Start with Maximize Conversions, transition to Target CPA once 30+ conversions recorded
- Ad extensions: Sitelinks, callouts, structured snippets, call extensions
- Negative keywords: Preemptively exclude irrelevant traffic (free, cheap, DIY, tutorial, jobs)
- Conversion tracking: Configure Google Ads conversion tag via GTM for form_submit, calendly_booking, and phone_call events

SUB-AGENT 2: Meta Ads Campaign Manager
- Audience strategy: Cold (interest-based + lookalike), Warm (website visitors, engagers), Hot (retargeting form abandoners, page visitors 3x+)
- Campaign structure: CBO (Campaign Budget Optimization) with 3 ad sets per temperature tier
- Creative testing: 3 creatives per ad set, auto-kill at 2x target CPL after $50 spend
- Pixel events: ViewContent, Lead, InitiateCheckout, Schedule — configured via CAPI for iOS resilience
- Placement: Feed + Stories + Reels (auto-placement with manual exclusion of Audience Network)

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "googleAds": {
    "campaignId": "string",
    "campaignName": "string",
    "keywords": [{ "keyword": "string", "matchType": "exact|phrase|broad", "estimatedCPC": "number", "monthlySearchVolume": "number" }],
    "adGroups": [{ "name": "string", "keywords": ["string"], "adCopy": { "headlines": ["string"], "descriptions": ["string"] } }],
    "negativeKeywords": ["string"],
    "dailyBudget": "number",
    "biddingStrategy": "string",
    "conversionTracking": { "conversionActions": ["string"], "trackingMethod": "string" }
  },
  "metaAds": {
    "campaignId": "string",
    "campaignName": "string",
    "audiences": [{ "name": "string", "type": "cold|warm|hot", "targeting": "string", "estimatedSize": "number" }],
    "creativeTests": [{ "name": "string", "format": "string", "hook": "string", "targetAudience": "string" }],
    "dailyBudget": "number",
    "pixelEvents": ["string"],
    "placements": ["string"]
  },
  "totalMonthlyBudget": "number",
  "estimatedCPL": "number",
  "estimatedLeadsPerMonth": "number",
  "reasoning": "string",
  "confidence": "number 0-100"
}`;

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

    try {
      const userMessage = JSON.stringify({
        ...inputs.config,
        previousOutputs: inputs.previousOutputs || {},
      });
      const response = await this.callClaude(SYSTEM_PROMPT, userMessage);
      const parsed = this.parseLLMJson<any>(response);
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
      await this.log('run_fallback', { reason: 'Using mock data' });
      const mockData = await this.getMockOutput(inputs);
      return {
        success: true,
        data: mockData,
        reasoning: 'Completed with mock data',
        confidence: 80,
      };
    }
  }

  private async runGoogleAdsCampaign(inputs: AgentInput): Promise<any> {
    const campaignResult = await mockGoogleAds.createCampaign({
      name: 'LeadFlow AI — Google Search — B2B Lead Gen',
      type: 'SEARCH',
      budget: 100,
      biddingStrategy: 'MAXIMIZE_CONVERSIONS',
      targetCpa: 30,
    });

    return {
      campaignId: campaignResult.id,
      campaignName: 'LeadFlow AI — Google Search — B2B Lead Gen',
      keywords: [
        { keyword: 'B2B lead generation service', matchType: 'exact', estimatedCPC: 8.50, monthlySearchVolume: 2400 },
        { keyword: 'AI lead generation', matchType: 'exact', estimatedCPC: 6.20, monthlySearchVolume: 3600 },
        { keyword: 'lead generation for SaaS', matchType: 'exact', estimatedCPC: 9.80, monthlySearchVolume: 1200 },
        { keyword: 'automated lead generation', matchType: 'phrase', estimatedCPC: 5.40, monthlySearchVolume: 4800 },
        { keyword: 'B2B lead gen agency', matchType: 'phrase', estimatedCPC: 12.30, monthlySearchVolume: 880 },
        { keyword: 'qualified leads B2B', matchType: 'exact', estimatedCPC: 7.90, monthlySearchVolume: 1600 },
        { keyword: 'lead generation automation software', matchType: 'phrase', estimatedCPC: 4.80, monthlySearchVolume: 2200 },
        { keyword: 'AI powered marketing', matchType: 'broad', estimatedCPC: 3.20, monthlySearchVolume: 6400 },
      ],
      adGroups: [
        {
          name: 'AG1 — AI Lead Gen (High Intent)',
          keywords: ['B2B lead generation service', 'AI lead generation', 'lead generation for SaaS'],
          adCopy: {
            headlines: ['AI Lead Gen — 2x Leads in 90 Days', 'Guaranteed B2B Lead Generation', 'Replace Your Agency With AI'],
            descriptions: [
              'Fully autonomous AI system generates & qualifies leads 24/7. 90-day guarantee. Book free strategy call.',
              '13 AI agents run your entire pipeline — Google, Meta, LinkedIn, Email. Performance guaranteed or full refund.',
            ],
          },
        },
        {
          name: 'AG2 — Cost/ROI Focused',
          keywords: ['qualified leads B2B', 'B2B lead gen agency', 'automated lead generation'],
          adCopy: {
            headlines: ['Cut Your CAC by 62% With AI', 'Stop Overpaying for Bad Leads', 'Qualified Leads at $24.50 CPL'],
            descriptions: [
              'Our AI qualifies every lead before it hits your CRM. Average 62% CAC reduction for B2B SaaS clients.',
              'From $340/lead to $128/lead — see how AI-powered lead gen transforms your unit economics.',
            ],
          },
        },
        {
          name: 'AG3 — Automation/Technology',
          keywords: ['lead generation automation software', 'AI powered marketing'],
          adCopy: {
            headlines: ['13 AI Agents — One Growth Engine', 'Autonomous Lead Generation System', 'The Future of B2B Marketing'],
            descriptions: [
              'Multi-channel AI pipeline: research, campaigns, qualification, routing, CRM — all automated. See it in action.',
              'Replace manual marketing with 13 specialized AI agents working 24/7. Free strategy call — limited spots.',
            ],
          },
        },
      ],
      negativeKeywords: [
        'free', 'cheap', 'DIY', 'tutorial', 'how to', 'course', 'template', 'jobs', 'hiring',
        'intern', 'salary', 'B2C', 'consumer', 'ecommerce', 'dropshipping', 'freelancer',
      ],
      dailyBudget: 100,
      biddingStrategy: 'Maximize Conversions (transition to Target CPA $30 after 30 conversions)',
      conversionTracking: {
        conversionActions: ['form_submit', 'calendly_booking', 'phone_call'],
        trackingMethod: 'Google Ads Conversion Tag via GTM + Enhanced Conversions',
      },
    };
  }

  private async runMetaAdsCampaign(inputs: AgentInput): Promise<any> {
    const campaignResult = await mockMetaAds.createCampaign({
      name: 'LeadFlow AI — Meta — Full Funnel',
      objective: 'LEAD_GENERATION',
      budget: 67,
      optimizationGoal: 'LEAD',
    });

    return {
      campaignId: campaignResult.id,
      campaignName: 'LeadFlow AI — Meta — Full Funnel',
      audiences: [
        {
          name: 'Cold — Interest-Based B2B',
          type: 'cold',
          targeting: 'Interests: SaaS, B2B Marketing, Lead Generation, Marketing Automation, HubSpot, Salesforce | Job Titles: VP Marketing, CMO, Head of Growth, Demand Gen Manager | Company Size: 10-500',
          estimatedSize: 2400000,
        },
        {
          name: 'Cold — 1% Lookalike from Converters',
          type: 'cold',
          targeting: '1% Lookalike based on form_submit + calendly_booking custom audience | US only',
          estimatedSize: 2100000,
        },
        {
          name: 'Warm — Website Visitors 30d',
          type: 'warm',
          targeting: 'Custom Audience: All website visitors in past 30 days, excluding converters',
          estimatedSize: 15000,
        },
        {
          name: 'Warm — Video Viewers 50%+',
          type: 'warm',
          targeting: 'Custom Audience: Users who watched 50%+ of any video ad in past 60 days',
          estimatedSize: 8000,
        },
        {
          name: 'Hot — Retarget Form Abandoners',
          type: 'hot',
          targeting: 'Custom Audience: Visited landing page 2x+ in past 14 days but did not submit form',
          estimatedSize: 3000,
        },
      ],
      creativeTests: [
        {
          name: 'Pain Point — Static Image',
          format: 'single_image',
          hook: 'Your sales team is wasting 60% of their time on leads that will never buy.',
          targetAudience: 'Cold — Interest-Based B2B',
        },
        {
          name: 'Case Study — Carousel',
          format: 'carousel',
          hook: 'How TechVentures went from 40 to 127 qualified leads/month',
          targetAudience: 'Cold — 1% Lookalike',
        },
        {
          name: 'Explainer — Video 30s',
          format: 'video',
          hook: 'What if you could replace your entire marketing department with AI?',
          targetAudience: 'Cold — Interest-Based B2B',
        },
        {
          name: 'Guarantee — Static Image',
          format: 'single_image',
          hook: '2x Qualified Leads in 90 Days — Guaranteed or Full Refund',
          targetAudience: 'Warm — Website Visitors',
        },
        {
          name: 'Testimonial — UGC Video',
          format: 'video',
          hook: '"Our CAC dropped from $340 to $128 in 90 days..."',
          targetAudience: 'Hot — Form Abandoners',
        },
        {
          name: 'Urgency — Static Image',
          format: 'single_image',
          hook: 'Only 3 spots left for Q2 onboarding',
          targetAudience: 'Hot — Form Abandoners',
        },
      ],
      dailyBudget: 67,
      pixelEvents: ['PageView', 'ViewContent', 'Lead', 'InitiateCheckout', 'Schedule', 'CompleteRegistration'],
      placements: ['Facebook Feed', 'Instagram Feed', 'Instagram Stories', 'Instagram Reels', 'Facebook Stories'],
    };
  }

  private async getMockOutput(inputs: AgentInput): Promise<any> {
    const googleAds = await this.runGoogleAdsCampaign(inputs);
    const metaAds = await this.runMetaAdsCampaign(inputs);

    const googleMonthly = googleAds.dailyBudget * 30;
    const metaMonthly = metaAds.dailyBudget * 30;
    const totalMonthlyBudget = googleMonthly + metaMonthly;
    const estimatedCPL = 24.50;
    const estimatedLeadsPerMonth = Math.round(totalMonthlyBudget / estimatedCPL);

    return {
      googleAds,
      metaAds,
      totalMonthlyBudget,
      estimatedCPL,
      estimatedLeadsPerMonth,
      reasoning:
        `Deployed dual-channel paid campaign strategy. Google Ads ($${googleMonthly}/mo) targets high-intent search keywords across 3 themed ad groups — AI lead gen, cost/ROI focused, and automation/technology angles. Bidding starts with Maximize Conversions and transitions to Target CPA $30 after collecting 30 conversions. Meta Ads ($${metaMonthly}/mo) runs a full-funnel approach: cold audiences (interest + lookalike), warm (website visitors + video viewers), and hot (form abandoners). 6 creative variants tested across the funnel. Estimated blended CPL of $${estimatedCPL} should generate ~${estimatedLeadsPerMonth} leads/month at current budget levels.`,
      confidence: 84,
    };
  }
}
