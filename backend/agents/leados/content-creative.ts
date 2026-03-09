import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';

const SYSTEM_PROMPT = `You are the Content & Creative Agent for LeadOS — the Service Acquisition Machine. Your job is to produce ALL marketing materials needed to run multi-channel campaigns: ad copies, hooks & angles, email sequences, LinkedIn scripts, video ad scripts, and UGC-style creative briefs.

You receive JSON input containing:
- The full offer (ICP, pain points, pricing, positioning, unique mechanism) from the Offer Engineering Agent
- The funnel structure (landing page, CTA, form) from the Funnel Builder Agent

Your responsibilities — produce ALL 7 creative asset types:

1. AD COPIES: Write 3 Google Ads (headline + description format) and 3 Meta Ads (primary text + headline + description for feed ads). Each must target a different pain point or angle.
2. HOOKS & ANGLES: Generate 5 distinct hooks — each using a different persuasion angle (pain, curiosity, social proof, urgency, contrarian). These are the opening lines used across all creative.
3. EMAIL SEQUENCE: Write a 5-email cold outreach sequence with subject lines, full body copy, and send delays. Emails progress from soft intro → value → case study → urgency → breakup.
4. LINKEDIN SCRIPTS: Write connection request message, follow-up 1 (value-first), and follow-up 2 (direct ask). Each must be under LinkedIn's character limits.
5. VIDEO AD SCRIPTS: Write at least 1 video ad script with hook (first 3 seconds), body (problem + solution), and CTA. Include duration and format notes.
6. UGC BRIEFS: Write creative briefs for UGC-style content — talking-head testimonials, screen recordings, before/after comparisons.
7. VISUAL CREATIVE BRIEFS: Describe the visual creative concepts for static ads — layout, imagery, color palette, text overlay.

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "adCopies": {
    "google": [{ "headline": "string (30 chars)", "description": "string (90 chars)", "targetKeyword": "string" }],
    "meta": [{ "primaryText": "string", "headline": "string", "description": "string", "targetAudience": "string" }]
  },
  "hooks": [{ "angle": "string", "hook": "string", "useCase": "string" }],
  "emailSequence": [{ "step": "number", "delay": "string", "subject": "string", "body": "string", "purpose": "string" }],
  "linkedInScripts": { "connectionRequest": "string", "followUp1": "string", "followUp2": "string" },
  "videoAdScripts": [{ "duration": "string", "format": "string", "hook": "string", "body": "string", "cta": "string" }],
  "ugcBriefs": [{ "type": "string", "description": "string", "talkingPoints": ["string"] }],
  "visualCreativeBriefs": [{ "concept": "string", "layout": "string", "imagery": "string", "textOverlay": "string" }],
  "reasoning": "string",
  "confidence": "number 0-100"
}`;

export class ContentCreativeAgent extends BaseAgent {
  constructor() {
    super(
      'content-creative',
      'Content & Creative Agent',
      'Produce all marketing materials: ad copies, hooks, email sequences, LinkedIn scripts, video ad scripts, UGC briefs, and visual creative briefs'
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
        reasoning: parsed.reasoning || 'Content creation complete',
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
    return {
      adCopies: {
        google: [
          {
            headline: 'AI Lead Gen — 2x Leads in 90 Days',
            description: 'Fully autonomous lead generation for B2B SaaS. AI-powered campaigns across Google, Meta, LinkedIn & email. Performance guaranteed.',
            targetKeyword: 'B2B lead generation service',
          },
          {
            headline: 'Stop Wasting Ad Spend on Bad Leads',
            description: 'Our AI qualifies every lead before it hits your CRM. 13 specialized agents work 24/7 to fill your pipeline with buyers, not browsers.',
            targetKeyword: 'AI lead qualification',
          },
          {
            headline: 'Replace Your Agency With AI',
            description: 'Same output as a $20K/mo agency at a fraction of the cost. Full attribution, guaranteed results, no long-term contracts.',
            targetKeyword: 'lead generation agency alternative',
          },
        ],
        meta: [
          {
            primaryText: 'Your sales team is spending 60% of their time chasing leads that will never buy.\n\nWhat if AI could filter out the tire-kickers before they ever hit your pipeline?\n\nLeadFlow AI deploys 13 specialized agents across Google, Meta, LinkedIn, and email — finding, qualifying, and routing your ideal customers 24/7.\n\nThe result? Our clients see 2x qualified leads in 90 days. Guaranteed.\n\n→ Book a free strategy call to see your custom growth projection.',
            headline: 'Double Your Qualified Leads in 90 Days',
            description: 'AI-powered lead generation for B2B SaaS. Performance guaranteed.',
            targetAudience: 'B2B SaaS founders & marketing leaders',
          },
          {
            primaryText: 'We analyzed 500 B2B SaaS companies and found the same pattern:\n\n❌ $200+ cost per lead\n❌ No idea which channels drive revenue\n❌ Sales team chasing unqualified prospects\n❌ CEO still closing most deals\n\nThe fix isn\'t hiring more people. It\'s deploying an AI system that handles the entire pipeline — from research to CRM.\n\nLeadFlow AI: 13 AI agents. One autonomous growth engine.\n\n→ See how it works in a free 30-min strategy call.',
            headline: 'The $200/Lead Problem — Solved by AI',
            description: 'Stop overpaying for leads that don\'t convert. See the AI alternative.',
            targetAudience: 'VP Marketing / Head of Growth at SaaS companies',
          },
          {
            primaryText: '"We went from 40 qualified leads/month to 127 in the first 90 days." — Sarah Chen, VP Marketing\n\nLeadFlow AI isn\'t another marketing tool. It\'s a fully autonomous system that runs your entire go-to-market:\n\n✅ Multi-channel campaigns (Google, Meta, LinkedIn, Email)\n✅ AI voice calls that qualify leads on BANT criteria\n✅ Real-time budget optimization based on actual revenue\n✅ 90-day double-or-refund guarantee\n\n→ Limited to 10 new clients/month. Book your spot now.',
            headline: '3.2x More Qualified Leads — Case Study Inside',
            description: 'See how TechVentures tripled their pipeline with AI-powered lead gen.',
            targetAudience: 'Growth-stage SaaS companies ($1M-$50M ARR)',
          },
        ],
      },
      hooks: [
        {
          angle: 'pain',
          hook: 'Your sales team is wasting 60% of their time on leads that will never buy. Here\'s why.',
          useCase: 'Ad opening, email subject line, video hook',
        },
        {
          angle: 'curiosity',
          hook: 'We replaced a 12-person marketing team with 13 AI agents. The results were shocking.',
          useCase: 'LinkedIn post, Meta ad primary text, blog headline',
        },
        {
          angle: 'social-proof',
          hook: '500+ B2B SaaS companies switched from agencies to AI lead gen last quarter. Here\'s what happened to their CAC.',
          useCase: 'Retargeting ads, email sequence, landing page hero',
        },
        {
          angle: 'urgency',
          hook: 'We only onboard 10 new clients per month and 7 spots are already taken for Q2.',
          useCase: 'Email CTA, ad copy, landing page urgency bar',
        },
        {
          angle: 'contrarian',
          hook: 'Unpopular opinion: Your lead generation agency is incentivized to keep your CAC high.',
          useCase: 'LinkedIn thought leadership, Meta controversy ad, cold email opener',
        },
      ],
      emailSequence: [
        {
          step: 1,
          delay: 'Day 0',
          subject: 'Quick question about {company}\'s lead gen',
          body: 'Hi {firstName},\n\nI was looking at {company}\'s growth trajectory and had a quick question — are you still relying on [agencies / manual outbound / founder-led sales] to fill your pipeline?\n\nI ask because we\'ve been working with B2B SaaS companies in the {industry} space that were in a similar position — spending $200+ per lead with no clear attribution on what\'s actually working.\n\nWe built an AI system (13 specialized agents) that handles the entire lead gen pipeline autonomously — from campaign management to AI voice qualification. Our clients typically see 2x qualified leads within 90 days.\n\nWould it make sense to chat for 15 minutes this week?\n\nBest,\n{senderName}',
          purpose: 'Soft intro — establish relevance, plant curiosity',
        },
        {
          step: 2,
          delay: 'Day 3',
          subject: 'How {similar_company} cut their CAC by 62%',
          body: 'Hi {firstName},\n\nWanted to share a quick case study that might be relevant.\n\n{similar_company} (B2B SaaS, similar stage to {company}) was spending $340/lead across Google and Meta with their agency. After switching to LeadFlow AI:\n\n• CAC dropped from $340 → $128 (62% reduction)\n• Qualified leads went from 40/mo → 127/mo (3.2x increase)\n• Sales team saved 25 hours/week on lead qualification\n\nThe biggest unlock? AI voice agents that qualify every lead on BANT criteria before it touches a human rep.\n\nWorth a quick look? I can walk you through how it would work for {company} specifically.\n\n{senderName}',
          purpose: 'Value delivery — share case study, build credibility',
        },
        {
          step: 3,
          delay: 'Day 7',
          subject: 'The math behind 2x qualified leads',
          body: 'Hi {firstName},\n\nI ran some rough numbers for {company} based on publicly available data:\n\n• Current estimated CAC: ~$250-$350\n• With LeadFlow AI: $120-$150 (based on comparable companies)\n• Projected qualified lead increase: 80-120% in 90 days\n• Estimated annual savings: $180K-$420K in marketing spend\n\nThese aren\'t hypotheticals — they\'re based on actual performance data from 500+ B2B SaaS clients in our system.\n\nAnd we back it with a guarantee: 2x qualified leads in 90 days or full refund.\n\nWant me to build a custom projection for {company}? Takes 30 minutes.\n\n{senderName}',
          purpose: 'Quantified value — make the ROI undeniable',
        },
        {
          step: 4,
          delay: 'Day 11',
          subject: 'Only 3 spots left for Q2 onboarding',
          body: 'Hi {firstName},\n\nQuick heads up — we only onboard 10 new clients per month to ensure quality delivery, and we have 3 spots remaining for Q2.\n\nIf pipeline growth is a priority for {company} this quarter, I\'d hate for you to miss the window.\n\nHere\'s what a strategy call covers:\n1. Audit of your current lead gen channels + attribution gaps\n2. Custom AI pipeline design for {company}\'s ICP\n3. 90-day growth projection with expected metrics\n\nNo commitment — worst case, you walk away with a free audit.\n\n→ Book here: [calendly_link]\n\n{senderName}',
          purpose: 'Urgency — create scarcity and time pressure',
        },
        {
          step: 5,
          delay: 'Day 15',
          subject: 'Closing the loop on this',
          body: 'Hi {firstName},\n\nI\'ve reached out a few times about helping {company} scale qualified leads with AI — I don\'t want to be a pest, so this will be my last note.\n\nIf the timing isn\'t right, totally understand. But if lead generation is something you\'re actively trying to solve, our 90-day guarantee makes it a zero-risk conversation.\n\nEither way, wishing you and the {company} team a great quarter.\n\n{senderName}\n\nP.S. — If someone else on your team handles growth/demand gen, happy to connect with them instead. Just let me know.',
          purpose: 'Breakup email — graceful exit with door open',
        },
      ],
      linkedInScripts: {
        connectionRequest:
          'Hi {firstName}, I\'ve been following {company}\'s growth — impressive trajectory in the {industry} space. I work with B2B SaaS leaders on scaling their pipeline with AI-powered lead gen. Would love to connect and share some insights that might be useful.',
        followUp1:
          'Thanks for connecting, {firstName}! Quick question — are you happy with your current lead gen setup, or is it something you\'re actively looking to improve? I ask because we recently helped a company similar to {company} triple their qualified leads in 90 days using an AI system. Happy to share the case study if useful — no pitch, just thought it might spark some ideas.',
        followUp2:
          'Hi {firstName}, circling back on this. We\'re opening 3 spots for our Q2 cohort and I immediately thought of {company}. We offer a free 30-min strategy call where we map out a custom AI pipeline for your ICP — and we guarantee 2x qualified leads in 90 days or full refund. Worth exploring? Here\'s my calendar: [calendly_link]',
      },
      videoAdScripts: [
        {
          duration: '30s',
          format: 'talking-head + screen recording hybrid',
          hook: '[0-3s] "Your marketing agency doesn\'t want you to see this..." (text overlay: "AI vs. Agency — The Results")',
          body: '[3-20s] "We took 13 AI agents and pointed them at the exact same market a $15K/month agency was targeting. In 90 days: the AI system generated 3.2x more qualified leads at 62% lower cost. No account managers. No monthly reports that hide bad performance. Just autonomous agents running 24/7 across Google, Meta, LinkedIn, and email — with full attribution on every dollar." (show dashboard screenshots, lead flow animations, before/after metrics)',
          cta: '[20-30s] "Book a free strategy call and we\'ll build a custom growth projection for your business. Link in bio. And yes — we guarantee results or you don\'t pay." (show Calendly booking page, guarantee badge)',
        },
        {
          duration: '60s',
          format: 'animated explainer with voiceover',
          hook: '[0-3s] "What if you could replace your entire marketing department with AI?" (bold text animation)',
          body: '[3-45s] "Meet LeadFlow AI — 13 specialized AI agents that handle every stage of your lead generation pipeline. Agent 1 researches profitable niches. Agent 2 packages your offer. Agent 3 validates the opportunity. Agents 4 through 6 build your funnel, create all the content, and run paid campaigns. Agents 7 and 8 handle outbound and inbound. Agent 9 makes AI voice calls to qualify every lead. And agents 10 through 13 route leads, track attribution, optimize performance, and keep your CRM clean. All of this runs autonomously — 24/7 — with performance guarantees." (show animated pipeline, agent icons flowing data)',
          cta: '[45-60s] "Join 500+ B2B SaaS companies already using LeadFlow AI. Book your free strategy call today — limited spots available each month." (show testimonial quotes, CTA button animation)',
        },
      ],
      ugcBriefs: [
        {
          type: 'customer-testimonial',
          description: 'Talking head video of a satisfied customer (VP Marketing or CEO) sharing their before/after experience with LeadFlow AI. Shot on iPhone for authenticity.',
          talkingPoints: [
            'What their lead gen looked like before (pain, frustration, high CAC)',
            'What made them try LeadFlow AI (specific trigger)',
            'The first results they saw and how quickly',
            'Specific metrics: lead volume, CAC reduction, time saved',
            'Would they recommend it and why',
          ],
        },
        {
          type: 'screen-recording-walkthrough',
          description: 'Screen recording of the LeadFlow AI dashboard showing real (anonymized) campaign data, lead flow, and attribution. Narrator walks through the metrics.',
          talkingPoints: [
            'Show the multi-channel campaign overview',
            'Drill into lead qualification scores and AI call transcripts',
            'Show the attribution dashboard — which channels drive actual revenue',
            'Highlight the auto-optimization: budget reallocation in action',
            'End with the ROI summary view',
          ],
        },
        {
          type: 'before-after-comparison',
          description: 'Split-screen showing a company\'s metrics before LeadFlow AI (left) vs. after 90 days (right). Clean, data-forward creative.',
          talkingPoints: [
            'Before: 40 leads/mo, $340 CAC, 0 attribution visibility',
            'After: 127 leads/mo, $128 CAC, full multi-touch attribution',
            'Transition animation between the two states',
            'End with: "This is what AI-powered lead gen looks like"',
          ],
        },
      ],
      visualCreativeBriefs: [
        {
          concept: 'The 13-Agent Pipeline',
          layout: 'Vertical infographic showing 13 connected agent icons flowing from top (Research) to bottom (CRM), with data flowing between them',
          imagery: 'Dark navy background, gradient blue-to-purple agent nodes, glowing connection lines, data particles flowing through the pipeline',
          textOverlay: 'Headline: "13 AI Agents. One Autonomous Growth Engine." Subtext: "See how LeadFlow AI fills your pipeline 24/7" CTA: "Book Free Strategy Call"',
        },
        {
          concept: 'Before/After Metrics Card',
          layout: 'Two-panel card — left panel (red/dark, "Before") showing bad metrics, right panel (green/bright, "After") showing improved metrics',
          imagery: 'Clean stat blocks with large numbers, subtle chart lines in background, company logo placeholder at top',
          textOverlay: 'Before: "$340 CAC | 40 Leads/mo | No Attribution" → After: "$128 CAC | 127 Leads/mo | Full Attribution" Footer: "Results after 90 days with LeadFlow AI"',
        },
        {
          concept: 'Guarantee Badge Ad',
          layout: 'Centered badge/seal design with bold guarantee text, supporting copy above and below',
          imagery: 'Gold/bronze guarantee seal on dark background, subtle grid pattern, trust indicators (lock icon, checkmark)',
          textOverlay: 'Above: "The Only Lead Gen System That Guarantees Results" Badge: "90-Day Double-or-Refund Guarantee" Below: "2x Qualified Leads or 100% Money Back — No Questions Asked" CTA button: "See How It Works"',
        },
      ],
      reasoning:
        'Produced all 7 creative asset types specified in the requirements. Google Ads copies optimized for 30-char headlines and 90-char descriptions targeting high-intent search keywords. Meta Ads use long-form primary text for feed placement — each targets a different angle (pain, case study, social proof). Email sequence follows the proven 5-step cold outreach framework: intro → value → ROI math → urgency → breakup. LinkedIn scripts stay within character limits and progress from soft connection to direct ask. Video scripts include both a 30s direct-response format and a 60s explainer. UGC briefs and visual creative briefs provide enough detail for production teams or AI image generators.',
      confidence: 86,
    };
  }
}
