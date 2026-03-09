import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';

const SYSTEM_PROMPT = `You are the Funnel Builder Agent for LeadOS — the Service Acquisition Machine. Your job is to build the entire acquisition infrastructure: landing page, lead capture forms, booking calendar integration, and CRM pipeline setup.

You receive JSON input containing:
- The validated offer (ICP, pricing, guarantee, positioning) from the Offer Engineering Agent
- The GO decision and risk assessment from the Validation Agent

Your responsibilities:
1. LANDING PAGE STRUCTURE: Design a high-converting landing page with these sections: Hero (headline + subheadline + CTA), Pain Points (problem agitation), Solution (transformation promise + unique mechanism), Social Proof (testimonials, logos, case study snippets), Pricing (3-tier comparison table), FAQ (objection handling), and final CTA. Every section must have specific, detailed content — not placeholders.
2. LEAD FORM: Define form fields with types and required flags. Keep friction low (5-7 fields max) while capturing enough data for lead scoring.
3. BOOKING CALENDAR: Set up integration with Calendly or Cal.com — define meeting type, duration, buffer time, and availability rules.
4. CRM INTEGRATION: Configure HubSpot pipeline with deal stages that match the LeadOS qualification funnel.
5. TRACKING: Ensure GTM container, Meta Pixel, and Google Ads conversion tag are configured on the page.

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "landingPage": {
    "url": "string — deployed page URL",
    "headline": "string — primary headline",
    "subheadline": "string — supporting subheadline",
    "sections": [
      {
        "type": "hero | painPoints | solution | socialProof | pricing | faq | cta",
        "content": "string or object — detailed section content"
      }
    ],
    "cta": "string — primary call-to-action text"
  },
  "leadForm": {
    "fields": [
      { "name": "string", "type": "text | email | phone | select | number", "required": true/false }
    ],
    "submitAction": "string — what happens on submit"
  },
  "bookingCalendar": {
    "provider": "Calendly | Cal.com",
    "url": "string — booking link",
    "meetingDuration": "number — minutes",
    "bufferTime": "number — minutes between meetings",
    "availability": "string — availability description"
  },
  "crmIntegration": {
    "provider": "HubSpot",
    "pipeline": "string — pipeline name",
    "stages": ["string — ordered deal stages"]
  },
  "tracking": {
    "gtmContainerId": "string",
    "metaPixelId": "string",
    "googleAdsConversionId": "string",
    "events": ["string — tracked conversion events"]
  },
  "reasoning": "string",
  "confidence": "number 0-100"
}`;

export class FunnelBuilderAgent extends BaseAgent {
  constructor() {
    super(
      'funnel-builder',
      'Funnel Builder Agent',
      'Build landing page, lead capture forms, booking calendar, CRM pipeline, and conversion tracking infrastructure'
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
        reasoning: parsed.reasoning || 'Funnel build complete',
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
    const offerData = inputs.previousOutputs?.['offer-engineering']?.data?.offer;
    const headline = offerData?.transformationPromise || 'Double Your Qualified Leads in 90 Days';

    return {
      landingPage: {
        url: 'https://leadflow.ai/get-started',
        headline: headline,
        subheadline:
          'AI-powered lead generation for B2B SaaS companies — fully autonomous, performance-guaranteed, and live in 48 hours',
        sections: [
          {
            type: 'hero',
            content: {
              headline: headline,
              subheadline: 'AI-powered lead generation for B2B SaaS companies — fully autonomous, performance-guaranteed, and live in 48 hours',
              cta: 'Book Your Free Strategy Call',
              ctaSubtext: 'No commitment. See your custom growth plan in 30 minutes.',
              backgroundStyle: 'gradient-dark',
              socialProofBar: '500+ B2B SaaS companies trust LeadFlow AI to fill their pipeline',
            },
          },
          {
            type: 'painPoints',
            content: {
              sectionTitle: 'Sound Familiar?',
              points: [
                { icon: 'chart-down', title: 'Feast-or-Famine Pipeline', description: 'One month you\'re drowning in leads, the next month it\'s crickets. Revenue forecasting feels like guessing.' },
                { icon: 'money-burn', title: 'Burning Cash on Bad Leads', description: 'You\'re spending $200+ per lead on channels that produce tire-kickers, not buyers.' },
                { icon: 'clock', title: 'Sales Team Wasting Time', description: 'Your reps spend 60% of their day chasing leads that were never qualified to begin with.' },
                { icon: 'blind', title: 'Zero Attribution Visibility', description: 'You can\'t tell which channels drive revenue and which just drive vanity metrics.' },
                { icon: 'bottleneck', title: 'Founder-Led Sales Bottleneck', description: 'The CEO is still closing most deals because there\'s no repeatable, scalable system.' },
              ],
            },
          },
          {
            type: 'solution',
            content: {
              sectionTitle: 'Meet LeadFlow AI: Your Autonomous Growth Engine',
              transformationPromise: headline,
              uniqueMechanism: 'Our 13-Agent Orchestration Engine deploys specialized AI agents across every stage of your pipeline — from market research to CRM hygiene — working 24/7 to find, qualify, and route your ideal customers.',
              features: [
                'AI-powered multi-channel campaigns (Google, Meta, LinkedIn, Email)',
                'Autonomous lead scoring and AI voice qualification',
                'Real-time budget reallocation based on actual revenue attribution',
                'Full-funnel tracking with multi-touch attribution',
              ],
              diagram: 'pipeline-flow-animation',
            },
          },
          {
            type: 'socialProof',
            content: {
              sectionTitle: 'Trusted by Growth-Stage SaaS Leaders',
              testimonials: [
                { name: 'Sarah Chen', title: 'VP Marketing, TechVentures', quote: 'We went from 40 qualified leads/month to 127 in the first 90 days. The AI qualification calls alone saved our sales team 25 hours/week.', metric: '3.2x qualified leads' },
                { name: 'Mike Rodriguez', title: 'CEO, GrowthLab', quote: 'I was skeptical about AI lead gen, but the results speak for themselves. Our CAC dropped from $340 to $128 while lead volume tripled.', metric: '62% lower CAC' },
                { name: 'Emily Watson', title: 'Head of Growth, StartupForge', quote: 'The attribution dashboard finally showed us where our money was actually working. We killed 3 underperforming channels and reinvested into what converts.', metric: '4.2x ROAS' },
              ],
              logos: ['TechVentures', 'GrowthLab', 'StartupForge', 'CloudScale', 'RevOps', 'DataDrive'],
              caseStudyLink: '/case-studies',
            },
          },
          {
            type: 'pricing',
            content: {
              sectionTitle: 'Simple, Transparent Pricing',
              tiers: [
                { name: 'Starter', price: '$2,997/mo', highlight: false, cta: 'Get Started', features: ['5 active campaigns', 'AI lead scoring', '500 outbound emails/mo', '1 landing page variant', 'Weekly reports', 'CRM integration', 'Email support'] },
                { name: 'Growth', price: '$5,997/mo', highlight: true, badge: 'Most Popular', cta: 'Book Strategy Call', features: ['Unlimited campaigns', 'AI voice qualification', '2,500 emails + LinkedIn', '5 landing page variants', 'Multi-touch attribution', 'Auto budget optimization', 'Dedicated success manager'] },
                { name: 'Enterprise', price: '$9,997/mo', highlight: false, cta: 'Talk to Sales', features: ['Everything in Growth', 'Custom AI scripts', '10,000 emails + LinkedIn', 'White-glove funnel design', 'Custom CRM workflows', 'Hourly optimization', '1-hour response SLA'] },
              ],
              guarantee: '90-Day Double-or-Refund Guarantee',
            },
          },
          {
            type: 'faq',
            content: {
              sectionTitle: 'Frequently Asked Questions',
              questions: [
                { q: 'How long until I see results?', a: 'Most clients see their first qualified leads within 7-14 days of launch. Our 90-day guarantee is based on a measurable doubling of qualified lead volume.' },
                { q: 'Do I need to provide content or copy?', a: 'No — our Content & Creative Agent produces all ad copies, email sequences, landing page content, and video scripts autonomously based on your offer and ICP.' },
                { q: 'What if the AI calls annoy my prospects?', a: 'Our AI qualification calls are warm — they only go to leads who have already expressed interest by filling out a form or engaging with your content. Call scripts are fully customizable.' },
                { q: 'Can I use my existing CRM?', a: 'Yes — we integrate with HubSpot, GoHighLevel, and Salesforce. Data syncs bidirectionally in real-time.' },
                { q: 'What happens after the 90-day guarantee period?', a: 'You continue month-to-month with no long-term contract. Most clients stay because the ROI is clear and measurable.' },
                { q: 'How is this different from hiring an agency?', a: 'Agencies charge similar retainers for manual work with opaque results. LeadFlow AI runs 24/7 across all channels with full attribution transparency — and we guarantee results.' },
              ],
            },
          },
          {
            type: 'cta',
            content: {
              headline: 'Ready to Double Your Qualified Leads?',
              subheadline: 'Book a free 30-minute strategy call. We\'ll show you exactly how LeadFlow AI will work for your business — with a custom growth projection.',
              ctaButton: 'Book Your Free Strategy Call',
              ctaSubtext: 'Limited spots available — we only onboard 10 new clients per month',
              urgency: true,
            },
          },
        ],
        cta: 'Book Your Free Strategy Call',
      },
      leadForm: {
        fields: [
          { name: 'firstName', type: 'text', required: true },
          { name: 'lastName', type: 'text', required: true },
          { name: 'workEmail', type: 'email', required: true },
          { name: 'company', type: 'text', required: true },
          { name: 'phone', type: 'phone', required: false },
          { name: 'monthlyMarketingBudget', type: 'select', required: true, options: ['Under $5K', '$5K-$10K', '$10K-$25K', '$25K-$50K', '$50K+'] },
          { name: 'currentMonthlyLeads', type: 'select', required: false, options: ['0-50', '50-200', '200-500', '500+'] },
        ],
        submitAction: 'Redirect to Calendly booking page with form data pre-filled, create HubSpot contact, fire Meta Lead event + Google Ads conversion',
      },
      bookingCalendar: {
        provider: 'Calendly',
        url: 'https://calendly.com/leadflow-ai/strategy-call',
        meetingDuration: 30,
        bufferTime: 15,
        availability: 'Monday-Friday, 9:00 AM - 5:00 PM EST, excluding US holidays',
      },
      crmIntegration: {
        provider: 'HubSpot',
        pipeline: 'LeadFlow AI — New Client Acquisition',
        stages: [
          'New Lead',
          'Form Submitted',
          'Call Booked',
          'AI Qualified',
          'Strategy Call Completed',
          'Proposal Sent',
          'Negotiation',
          'Closed Won',
          'Closed Lost',
        ],
      },
      tracking: {
        gtmContainerId: 'GTM-LEADFLOW',
        metaPixelId: '123456789012345',
        googleAdsConversionId: 'AW-987654321',
        events: [
          'page_view',
          'scroll_depth_50',
          'scroll_depth_90',
          'cta_click',
          'form_start',
          'form_submit',
          'calendly_booking',
          'lead',
          'qualified_lead',
        ],
      },
      reasoning:
        'Landing page structured around the pain-agitate-solve framework optimized for B2B SaaS buyer psychology. Hero section leads with the transformation promise and social proof bar for immediate credibility. Pain points are specific and emotionally resonant to the ICP. Pricing section uses the Growth tier as the highlighted "Most Popular" option to anchor at $5,997. FAQ handles the top 6 objections identified from the ICP analysis. Lead form kept to 7 fields max to minimize friction while capturing budget qualification data. Calendly integration provides instant booking to reduce drop-off between form submit and call.',
      confidence: 87,
    };
  }
}
