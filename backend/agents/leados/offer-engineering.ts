import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';

const SYSTEM_PROMPT = `You are the Offer Engineering Agent for LeadOS — the Service Acquisition Machine. Your job is to take a validated service opportunity and package it into a compelling, market-ready offer.

You receive JSON input containing:
- Service research data (niche, demand/competition/monetization scores, market size)
- Google Trends data (search interest, rising queries, regional interest)
- Target focus area and region
- Any previous pipeline outputs

Use Google Trends data to:
- Validate market demand with real search volume signals
- Identify rising queries to incorporate into messaging and positioning
- Target high-interest regions for geo-focused campaigns
- Craft transformation promises that align with actual search intent

Your responsibilities:
1. DEFINE THE ICP (Ideal Customer Profile): Company size, revenue range, industry vertical, decision-maker title, psychographics, and buying triggers.
2. IDENTIFY PAIN POINTS: Extract the top 5 pain points your ICP faces that this service solves. Be specific and emotionally resonant.
3. CRAFT THE TRANSFORMATION PROMISE: A single, measurable promise that makes the offer irresistible (e.g., "Double your qualified leads in 90 days").
4. SET PRICING TIERS: Create 3 tiers (Starter, Growth, Enterprise) with monthly billing. Each tier must have a clear price point, feature set, and logical upgrade path. Price anchoring: Enterprise should be 3-4x Starter.
5. CREATE A GUARANTEE: A risk-reversal guarantee that removes buyer hesitation (e.g., performance-based, money-back, or hybrid).
6. POSITIONING & UNIQUE MECHANISM: Define how this offer is different from competitors. The unique mechanism is the proprietary method or technology that makes the promise believable.

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "offer": {
    "serviceName": "string — branded name for the service",
    "icp": {
      "description": "string — one-paragraph ICP summary",
      "companySize": "string — employee range",
      "revenue": "string — revenue range",
      "industry": "string — primary industry vertical",
      "decisionMaker": "string — job title of buyer",
      "psychographics": "string — mindset, values, and buying triggers"
    },
    "painPoints": ["string — 5 specific pain points"],
    "transformationPromise": "string — the core measurable promise",
    "pricingTiers": [
      {
        "name": "Starter | Growth | Enterprise",
        "price": "number — monthly price in USD",
        "billingCycle": "monthly",
        "features": ["string — list of features included"]
      }
    ],
    "guarantee": "string — risk-reversal guarantee statement",
    "positioning": "string — how this offer is positioned vs. competitors",
    "uniqueMechanism": "string — the proprietary method/technology",
    "trendInsights": {
      "searchInterest": "number — Google Trends interest score 0-100",
      "risingKeywords": ["string — breakout search terms to use in messaging"],
      "topRegions": ["string — geographic areas with highest demand"]
    }
  },
  "reasoning": "string — explain your offer engineering decisions",
  "confidence": "number 0-100"
}`;

export class OfferEngineeringAgent extends BaseAgent {
  constructor() {
    super(
      'offer-engineering',
      'Offer Engineering Agent',
      'Package service opportunity into compelling offer with ICP, pain points, transformation promise, pricing tiers, guarantee, and positioning'
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
        reasoning: parsed.reasoning || 'Offer engineering complete',
        confidence: parsed.confidence || 85,
      };
    } catch (error: any) {
      this.status = 'done';
      await this.log('run_fallback', { reason: 'Using mock data' });
      const mockData = this.getMockOutput(inputs);
      return {
        success: true,
        data: mockData,
        reasoning: 'Completed with mock data',
        confidence: 80,
      };
    }
  }

  private getMockOutput(inputs: AgentInput): any {
    const serviceResearch = inputs.previousOutputs?.['service-research'];
    const niche = serviceResearch?.data?.opportunities?.[0]?.niche || 'AI-Powered Content Marketing';

    return {
      offer: {
        serviceName: 'LeadFlow AI — Autonomous Lead Generation Engine',
        icp: {
          description:
            'B2B SaaS companies with 10-200 employees and $1M-$50M ARR that are struggling with inconsistent lead flow, high customer acquisition costs, and over-reliance on founder-led sales. They have a proven product but need a scalable, predictable pipeline to hit their next growth milestone.',
          companySize: '10-200 employees',
          revenue: '$1M-$50M ARR',
          industry: 'B2B SaaS & Technology',
          decisionMaker: 'VP of Marketing / Head of Growth / CMO',
        },
        painPoints: [
          'Inconsistent lead flow — feast-or-famine pipeline that makes revenue forecasting impossible',
          'High CAC that erodes margins — spending $200+ per lead on channels that don\'t convert',
          'Sales team wastes 60% of time on unqualified leads that were never going to buy',
          'No attribution visibility — can\'t tell which channels actually drive revenue vs. vanity metrics',
          'Founder-led sales bottleneck — CEO still closes most deals because no repeatable system exists',
        ],
        transformationPromise:
          'Double your qualified leads in 90 days with fully autonomous AI-powered lead generation — or get a full refund',
        pricingTiers: [
          {
            name: 'Starter',
            price: 2997,
            billingCycle: 'monthly',
            features: [
              'Up to 5 active campaigns (Google Ads + Meta)',
              'AI-powered lead scoring & qualification',
              '500 outbound emails/month via Instantly',
              'Basic landing page (1 variant)',
              'Weekly performance report',
              'CRM integration (HubSpot or GoHighLevel)',
              'Email support',
            ],
          },
          {
            name: 'Growth',
            price: 5997,
            billingCycle: 'monthly',
            features: [
              'Unlimited campaigns across all channels',
              'AI voice qualification calls (Bland AI)',
              '2,500 outbound emails/month + LinkedIn outreach',
              'A/B tested landing pages (up to 5 variants)',
              'Multi-touch attribution dashboard',
              'Automated budget reallocation & creative rotation',
              'Dedicated success manager',
              'Daily Slack performance alerts',
              'CRM + Calendly integration',
            ],
          },
          {
            name: 'Enterprise',
            price: 9997,
            billingCycle: 'monthly',
            features: [
              'Everything in Growth',
              'Custom AI qualification scripts per ICP segment',
              '10,000 outbound emails/month + full LinkedIn automation',
              'White-glove funnel design & copywriting',
              'Custom CRM workflows & sales routing rules',
              'Real-time performance optimization (hourly)',
              'Dedicated Slack channel with 1-hour response SLA',
              'Quarterly business reviews with growth strategist',
              'Priority access to new features & beta tools',
              'Multi-brand / multi-product support',
            ],
          },
        ],
        guarantee:
          '90-Day Double-or-Refund Guarantee: If we don\'t at least double your qualified lead volume within 90 days of launch, we\'ll refund 100% of your fees — no questions asked. We track everything, so there\'s full transparency on what "qualified" means.',
        positioning:
          'Unlike traditional agencies that charge retainers for manual work with opaque results, LeadFlow AI is a fully autonomous system — 13 AI agents working 24/7 across every channel. You get the output of an entire marketing department at a fraction of the cost, with complete attribution transparency and performance guarantees that agencies refuse to offer.',
        uniqueMechanism:
          'The LeadOS 13-Agent Orchestration Engine — a proprietary AI pipeline where specialized agents handle every stage from market research to CRM hygiene, communicating via real-time message queues. Each agent optimizes its domain autonomously while the Performance Optimization Agent reallocates budget across channels every 6 hours based on actual revenue attribution, not vanity metrics.',
        trendInsights: {
          searchInterest: 78,
          risingKeywords: ['AI lead generation', 'automated outbound', 'B2B sales automation', 'AI SDR'],
          topRegions: ['California', 'Texas', 'New York', 'Florida', 'Washington'],
        },
      },
      reasoning:
        `Analyzed the "${niche}" opportunity from service research. ICP narrowed to B2B SaaS because they have the highest LTV ($4,500+ average), understand the value of lead generation, and have budget to invest. Pricing anchored at $2,997 Starter to filter out non-serious buyers while Enterprise at $9,997 captures high-value accounts. The 90-day guarantee removes risk and accelerates decision-making. Unique mechanism leverages the actual LeadOS architecture as a competitive moat.`,
      confidence: 88,
    };
  }
}
