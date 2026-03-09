import { NextResponse } from 'next/server';

export function getAgentMockOutput(id: string) {
  return agentMockOutputs[id] || { success: true, data: { message: 'Completed successfully' }, reasoning: 'Analysis complete', confidence: 85 };
}

const agentMockOutputs: Record<string, any> = {
  'service-research': {
    success: true,
    data: {
      opportunities: [
        { niche: 'AI-Powered Content Marketing', demandScore: 92, competitionScore: 45, monetizationScore: 88, reasoning: 'Explosive demand for AI content services with relatively low competition from established agencies.', estimatedMarketSize: '$4.2B', targetPlatforms: ['LinkedIn', 'Google Ads'] },
        { niche: 'B2B LinkedIn Lead Generation', demandScore: 88, competitionScore: 55, monetizationScore: 84, reasoning: 'Strong demand from B2B companies seeking qualified leads through LinkedIn.', estimatedMarketSize: '$3.1B', targetPlatforms: ['LinkedIn'] },
        { niche: 'Shopify Store CRO Consulting', demandScore: 85, competitionScore: 62, monetizationScore: 79, reasoning: 'Growing e-commerce market with high willingness to pay for conversion optimization.', estimatedMarketSize: '$2.8B', targetPlatforms: ['Reddit', 'Upwork'] },
        { niche: 'SaaS Onboarding Optimization', demandScore: 78, competitionScore: 38, monetizationScore: 91, reasoning: 'Niche market with very high LTV potential and low competition.', estimatedMarketSize: '$1.5B', targetPlatforms: ['Google Trends'] },
        { niche: 'Paid Media for DTC Brands', demandScore: 90, competitionScore: 72, monetizationScore: 82, reasoning: 'High volume demand, specialization in DTC provides differentiation.', estimatedMarketSize: '$5.6B', targetPlatforms: ['Meta', 'Google Ads'] },
      ],
    },
    reasoning: 'Analyzed market signals across Google Trends, Reddit, LinkedIn, and Upwork. Top 5 opportunities ranked by composite score.',
    confidence: 87,
  },
  'offer-engineering': {
    success: true,
    data: {
      offer: {
        transformationPromise: 'We generate 50+ qualified B2B leads per month using AI-powered LinkedIn outreach — or you don\'t pay.',
        icp: { description: 'B2B SaaS companies with 10-200 employees, $1M-$20M ARR, selling to mid-market/enterprise', companySize: '10-200 employees', revenue: '$1M-$20M ARR' },
        painPoints: ['Inconsistent lead flow month to month', 'SDRs cost $60K+ and take 3 months to ramp', 'LinkedIn outreach is manual and unscalable', 'No attribution on which channels actually convert'],
        pricingTiers: [
          { name: 'Starter', price: 2500, billingCycle: 'mo', features: ['500 prospects/mo', 'LinkedIn outreach', 'Basic reporting', 'Email support'] },
          { name: 'Growth', price: 5000, billingCycle: 'mo', features: ['1,500 prospects/mo', 'LinkedIn + Cold Email', 'AI qualification calls', 'Dedicated CSM', 'Weekly reporting'] },
          { name: 'Scale', price: 10000, billingCycle: 'mo', features: ['5,000 prospects/mo', 'All channels', 'AI voice qualification', 'Custom integrations', 'Real-time dashboard', 'Guaranteed 50+ SQLs'] },
        ],
        guarantee: '50+ qualified leads in 90 days or your next month is free. We put skin in the game.',
        positioning: 'The only AI-powered lead gen system that guarantees qualified meetings, not just impressions.',
      },
    },
    reasoning: 'Engineered offer based on top service opportunity (AI-Powered Content Marketing) with tiered pricing and strong guarantee.',
    confidence: 91,
  },
  'validation': {
    success: true,
    data: {
      decision: 'GO',
      cacEstimate: 127,
      ltvEstimate: 15000,
      ltvCacRatio: 118,
      riskScore: 28,
      scores: { marketDemand: 92, competitiveSaturation: 45, pricingFeasibility: 88 },
      riskFactors: [
        { factor: 'AI content market is evolving rapidly — commoditization risk within 18 months', mitigation: 'Build proprietary workflows and lock in annual contracts early' },
        { factor: 'Enterprise sales cycles can extend to 3-6 months', mitigation: 'Offer SMB starter tier for faster revenue while nurturing enterprise deals' },
        { factor: 'Dependence on LinkedIn API — platform risk', mitigation: 'Diversify outreach channels; add cold email and paid traffic early' },
      ],
    },
    reasoning: 'Strong GO decision — LTV/CAC ratio of 118x with manageable risks. Market demand is high and competition is moderate.',
    confidence: 94,
  },
  'funnel-builder': {
    success: true,
    data: {
      landingPage: {
        headline: 'Get 50+ Qualified B2B Leads Every Month — Guaranteed',
        subheadline: 'AI-powered outreach that books meetings while you sleep. No SDRs needed.',
        url: 'https://leadgen-ai.webflow.io',
        sections: ['Hero + CTA', 'Social Proof', 'How It Works', 'Pricing', 'FAQ', 'Final CTA'],
        cta: 'Book Your Free Strategy Call',
      },
      leadForm: {
        fields: [
          { name: 'Full Name', required: true },
          { name: 'Work Email', required: true },
          { name: 'Company', required: true },
          { name: 'Monthly Marketing Budget', required: false },
          { name: 'Phone', required: false },
        ],
      },
      bookingCalendar: { provider: 'Cal.com', meetingDuration: 30 },
      crmIntegration: { provider: 'HubSpot', syncFields: ['name', 'email', 'company', 'score', 'source'] },
    },
    reasoning: 'Built landing page with optimized conversion flow, lead capture form, and Cal.com booking integration.',
    confidence: 89,
  },
  'content-creative': {
    success: true,
    data: {
      hooks: [
        { text: 'Your SDR team costs $180K/year. Our AI books more meetings for $5K/mo.', angle: 'Cost comparison' },
        { text: 'We booked 73 qualified meetings in 30 days for a SaaS company. Here\'s exactly how.', angle: 'Case study' },
        { text: 'Stop paying for leads that ghost you. Start paying for leads that show up.', angle: 'Pain point' },
      ],
      emailSequence: [
        { subject: 'Quick question about {{company}}\'s growth', delay: 0, body: 'Hi {{firstName}}, I noticed {{company}} is scaling fast. Most B2B companies at your stage struggle with consistent lead flow...' },
        { subject: 'Re: {{company}}\'s lead gen', delay: 3, body: 'Hey {{firstName}}, just wanted to follow up. We recently helped a similar company book 73 meetings in 30 days...' },
        { subject: '50+ SQLs guaranteed — here\'s how', delay: 7, body: '{{firstName}}, quick one — we guarantee 50+ qualified leads in 90 days or your next month is free...' },
      ],
      linkedInScripts: {
        connectionRequest: 'Hi {{firstName}} — I help B2B companies like {{company}} generate 50+ qualified leads/month with AI. Would love to connect.',
        followUp: 'Thanks for connecting! I saw {{company}} is in {{industry}}. We recently helped a similar company 3x their pipeline. Worth a quick chat?',
        valuePost: 'We analyzed 10,000 B2B outreach campaigns. Here\'s what the top 1% do differently...',
      },
      videoAdScripts: [
        { duration: '30s', hook: 'Your SDR costs $60K. Our AI costs $5K and never sleeps.', body: 'LeadOS uses AI to find, qualify, and book meetings with your ideal customers — automatically.', cta: 'Book a free strategy call — link in bio.' },
      ],
    },
    reasoning: 'Generated full creative package: 3 ad hooks, 3-email sequence, LinkedIn scripts, and video ad script.',
    confidence: 88,
  },
  'paid-traffic': {
    success: true,
    data: {
      totalMonthlyBudget: 8000,
      estimatedCPL: 24,
      estimatedLeadsPerMonth: 333,
      campaigns: [
        { platform: 'Google Ads', budget: 5000, dailyBudget: 167, keywords: ['B2B lead generation', 'AI lead gen service', 'automated lead generation', 'LinkedIn lead gen agency', 'SDR alternative'] },
        { platform: 'Meta Ads', budget: 3000, dailyBudget: 100, audiences: ['B2B SaaS founders', 'VP Sales at 50-500 companies', 'Marketing directors', 'Lookalike — past converters'] },
      ],
    },
    reasoning: 'Split budget 63/37 between Google (high intent) and Meta (scale). Estimated blended CPL of $24.',
    confidence: 85,
  },
  'outbound-outreach': {
    success: true,
    data: {
      projectedMetrics: { emailsSent: 3000, expectedReplies: 150, expectedMeetings: 30, linkedInConnections: 500 },
      coldEmail: {
        sequences: [
          { step: 1, subject: 'Quick question about {{company}}', purpose: 'Initial outreach — value-first approach', delay: 0 },
          { step: 2, subject: 'Re: {{company}} lead gen', purpose: 'Social proof follow-up with case study', delay: 3 },
          { step: 3, subject: '50+ SQLs — guarantee', purpose: 'Offer-focused with guarantee', delay: 7 },
          { step: 4, subject: 'Final note', purpose: 'Breakup email — create urgency', delay: 14 },
        ],
      },
      linkedIn: {
        sequences: [
          { type: 'Connection Request', step: 1, delay: 0, message: 'Hi {{firstName}} — helping B2B companies generate 50+ qualified leads/month with AI. Love to connect.' },
          { type: 'Follow-up DM', step: 2, delay: 2, message: 'Thanks for connecting! We recently helped a SaaS company 3x their pipeline in 60 days. Worth a quick chat?' },
          { type: 'Value Share', step: 3, delay: 5, message: 'Thought you might find this useful — our latest analysis of what top B2B companies do differently with outreach.' },
        ],
      },
    },
    reasoning: 'Set up 4-step cold email sequence via Instantly + 3-step LinkedIn sequence. Targeting 3,000 prospects/month.',
    confidence: 86,
  },
  'inbound-capture': {
    success: true,
    data: {
      leadsProcessed: 47,
      scoringModel: {
        factors: [
          { name: 'Company Size', weight: 0.25, rules: [{ condition: '200+ employees', points: 25 }, { condition: '50-200 employees', points: 20 }, { condition: '<50 employees', points: 10 }] },
          { name: 'Budget Indicated', weight: 0.30, rules: [{ condition: '$10K+/mo', points: 30 }, { condition: '$5K-$10K/mo', points: 20 }, { condition: 'Not specified', points: 5 }] },
          { name: 'Engagement Score', weight: 0.25, rules: [{ condition: 'Multiple page visits + form submit', points: 25 }, { condition: 'Form submit only', points: 15 }] },
          { name: 'Source Quality', weight: 0.20, rules: [{ condition: 'Google Ads (high intent)', points: 20 }, { condition: 'Referral', points: 18 }, { condition: 'Social', points: 10 }] },
        ],
      },
      segmentation: {
        segments: [
          { name: 'Hot (80-100)', action: 'Immediate AI qualification call' },
          { name: 'Warm (50-79)', action: 'Nurture sequence + retarget' },
          { name: 'Cold (0-49)', action: 'Low-touch email drip' },
        ],
      },
    },
    reasoning: 'Processed 47 inbound leads, applied scoring model, and segmented into 3 tiers for routing.',
    confidence: 90,
  },
  'ai-qualification': {
    success: true,
    data: {
      voiceProvider: 'Bland AI',
      callScript: {
        qualificationQuestions: {
          budget: { question: 'What\'s your current monthly marketing/lead gen budget?', goodAnswers: ['$5K+', '$10K+', 'We have budget allocated'] },
          authority: { question: 'Are you the decision maker for marketing investments?', goodAnswers: ['Yes', 'I and my co-founder', 'VP-level authority'] },
          need: { question: 'What\'s your biggest challenge with lead generation right now?', goodAnswers: ['Inconsistent flow', 'High CAC', 'Can\'t scale'] },
          timeline: { question: 'When are you looking to implement a new solution?', goodAnswers: ['This month', 'Next 2 weeks', 'ASAP'] },
        },
      },
      callResults: [
        { leadId: 'Sarah Chen — TechVentures', score: 87, outcome: 'high_intent', duration: 272 },
        { leadId: 'Emily Watson — StartupForge', score: 93, outcome: 'high_intent', duration: 195 },
        { leadId: 'David Kim — CloudScale', score: 65, outcome: 'medium_intent', duration: 340 },
        { leadId: 'Rachel Green — SaaSify', score: 45, outcome: 'low_intent', duration: 156 },
      ],
      qualificationThresholds: {
        high_intent: { minScore: 80, action: 'Route to sales call' },
        medium_intent: { minScore: 50, action: 'Add to nurture sequence' },
        low_intent: { minScore: 0, action: 'Archive / low-touch drip' },
      },
    },
    reasoning: 'Completed 4 AI qualification calls. 2 high-intent leads routed to sales, 1 medium to nurture, 1 low to drip.',
    confidence: 88,
  },
  'sales-routing': {
    success: true,
    data: {
      summary: { checkout: 1, salesCall: 2, nurture: 1, disqualified: 1 },
      routedLeads: [
        { leadId: 'Emily Watson — StartupForge', score: 93, route: 'checkout', reason: 'High intent + budget confirmed + needs basic package' },
        { leadId: 'Sarah Chen — TechVentures', score: 87, route: 'sales_call', reason: 'High intent + enterprise deal — needs custom proposal' },
        { leadId: 'Sophie Martinez — BrandLift', score: 83, route: 'sales_call', reason: 'High intent + complex requirements — wants multi-channel package' },
        { leadId: 'David Kim — CloudScale', score: 65, route: 'nurture', reason: 'Medium intent — revisit in 2 weeks with case study' },
        { leadId: 'Lisa Park — EcomBoost', score: 38, route: 'disqualify', reason: 'Low budget, no authority, timeline > 6 months' },
      ],
    },
    reasoning: 'Routed 5 leads: 1 to checkout, 2 to sales calls, 1 to nurture, 1 disqualified.',
    confidence: 92,
  },
  'tracking-attribution': {
    success: true,
    data: {
      attributionModel: 'Multi-Touch (Linear + Time Decay)',
      attributionWindows: { clickThrough: '30 days', viewThrough: '7 days' },
      trackingSetup: {
        googleTagManager: { containerId: 'GTM-XXXX123', triggers: ['page_view', 'form_submit', 'button_click', 'scroll_depth', 'video_play'] },
        metaPixel: { pixelId: '123456789', standardEvents: ['PageView', 'Lead', 'CompleteRegistration', 'Schedule', 'Purchase'] },
        googleAdsConversion: { conversionActions: [{ name: 'Lead Form Submit', value: 25 }, { name: 'Meeting Booked', value: 150 }, { name: 'Deal Won', value: 5000 }] },
      },
    },
    reasoning: 'Set up complete tracking infrastructure: GTM with 5 triggers, Meta Pixel with 5 events, Google Ads with 3 conversion actions.',
    confidence: 93,
  },
  'performance-optimization': {
    success: true,
    data: {
      currentMetrics: { cpl: 24.50, cac: 127.80, roas: 4.2, ltv: 15000 },
      campaignAnalysis: [
        { campaign: 'Google Ads — B2B Lead Gen', status: 'scale', action: 'Increase budget by 30%', reason: 'CPL $20, ROAS 5.1x — top performer', metrics: { spend: 5000, leads: 250, cpl: 20, roas: 5.1 } },
        { campaign: 'Meta Ads — SaaS Founders', status: 'optimize', action: 'Refresh creative, narrow audience', reason: 'CPL $32 — above target but showing potential', metrics: { spend: 3000, leads: 94, cpl: 32, roas: 2.8 } },
        { campaign: 'LinkedIn Outbound', status: 'scale', action: 'Add 500 more prospects', reason: 'Reply rate 5.2% — above benchmark', metrics: { spend: 2000, leads: 45, cpl: 44, roas: 3.5 } },
        { campaign: 'Cold Email — Sequence B', status: 'kill', action: 'Pause and replace copy', reason: 'Reply rate 0.8% — well below 2% threshold', metrics: { spend: 800, leads: 6, cpl: 133, roas: 0.6 } },
      ],
    },
    reasoning: 'Analyzed 4 campaigns: 2 to scale, 1 to optimize, 1 to kill. Overall ROAS 4.2x.',
    confidence: 90,
  },
  'crm-hygiene': {
    success: true,
    data: {
      deduplication: { totalRecords: 1247, duplicatesRemoved: 23, accuracy: 99.2 },
      enrichment: { enrichmentRate: 87, fieldsAdded: ['company_size', 'revenue_range', 'industry', 'linkedin_url'] },
      validation: { invalidEmails: 12, invalidPhones: 8, missingRequiredFields: 34 },
      dataQualityScore: 94,
      lifecycleUpdates: [
        { leadId: 'Sarah Chen', from: 'qualified', to: 'booked', reason: 'Meeting scheduled via AI call' },
        { leadId: 'Emily Watson', from: 'booked', to: 'won', reason: 'Signed Starter package — $2,500/mo' },
        { leadId: 'David Kim', from: 'new', to: 'contacted', reason: 'Entered nurture sequence after medium-intent call' },
        { leadId: 'Lisa Park', from: 'contacted', to: 'lost', reason: 'Disqualified — no budget, timeline > 6 months' },
      ],
    },
    reasoning: 'Cleaned 1,247 records: removed 23 duplicates, enriched 87% of records, updated 4 lifecycle stages.',
    confidence: 95,
  },
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const output = getAgentMockOutput(id);

  return NextResponse.json([
    {
      id: 'run_demo_1',
      agentId: id,
      status: 'done',
      outputsJson: output,
      startedAt: '2026-03-08T14:00:00Z',
      completedAt: '2026-03-08T14:02:30Z',
    },
    {
      id: 'run_demo_2',
      agentId: id,
      status: 'done',
      outputsJson: output,
      startedAt: '2026-03-07T10:00:00Z',
      completedAt: '2026-03-07T10:01:45Z',
    },
  ]);
}
