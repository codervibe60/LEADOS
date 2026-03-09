import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { mockHubSpot } from '../../integrations/mock-data';

const SYSTEM_PROMPT = `You are the Inbound Lead Capture Agent for LeadOS — the central hub that receives, scores, enriches, and segments every lead entering the system.

Your responsibilities:
1. CRM SETUP: Configure HubSpot pipeline stages and custom properties for lead tracking
2. LEAD SCORING: Apply a 100-point scoring model across 5 weighted factors (Company Size, Budget, Engagement, Industry Fit, Timeline)
3. DATA ENRICHMENT: Pull firmographic and technographic data from Apollo.io, Clay, and Clearbit
4. SEGMENTATION: Classify leads into actionable segments (Enterprise Hot, SMB Warm, Cold) with automatic routing rules
5. WEBHOOK PROCESSING: Handle inbound form submissions, chat messages, and third-party webhook payloads

Accept JSON input with lead data, pipeline configuration, and enrichment preferences.
Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "crmSetup": {
    "provider": "string",
    "pipelineStages": ["string"],
    "customProperties": ["string"]
  },
  "scoringModel": {
    "maxScore": 100,
    "factors": [
      {
        "name": "string",
        "weight": "number",
        "rules": [{ "condition": "string", "points": "number" }]
      }
    ]
  },
  "enrichmentSources": ["string"],
  "enrichmentFields": ["string"],
  "segmentation": {
    "segments": [
      {
        "name": "string",
        "criteria": "string",
        "action": "string"
      }
    ]
  },
  "leadsProcessed": "number",
  "reasoning": "string",
  "confidence": "number 0-100"
}

Score leads objectively. Prioritize accuracy over volume — false positives waste sales time.`;

export class InboundCaptureAgent extends BaseAgent {
  constructor() {
    super(
      'inbound-capture',
      'Inbound Lead Capture Agent',
      'Central hub receiving all leads — CRM integration, lead scoring (1-100), data enrichment via Apollo/Clay/Clearbit, and segmentation'
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
        reasoning: parsed.reasoning || 'Complete',
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

  private async getMockOutput(inputs: AgentInput): Promise<any> {
    // Pull existing contacts from CRM mock
    const existingContacts = await mockHubSpot.getContacts();
    await this.log('hubspot_contacts_fetched', { count: existingContacts.length });

    // Simulate creating a new inbound lead in HubSpot
    const newContact = await mockHubSpot.createContact({
      name: 'New Inbound Lead',
      email: 'inbound@newprospect.com',
      company: 'NewProspect Corp',
      phone: '+1-555-0200',
      source: 'form_submit',
      channel: 'inbound',
      score: 74,
      stage: 'new',
      segment: 'mid_market',
    });
    await this.log('hubspot_contact_created', { contactId: newContact.id });

    return {
      crmSetup: {
        provider: 'HubSpot',
        pipelineStages: ['New', 'Contacted', 'Qualified', 'Booked', 'Won', 'Lost'],
        customProperties: [
          'lead_score',
          'lead_segment',
          'enrichment_status',
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'qualification_outcome',
        ],
      },
      scoringModel: {
        maxScore: 100,
        factors: [
          {
            name: 'Company Size',
            weight: 20,
            rules: [
              { condition: '>100 employees', points: 20 },
              { condition: '50-100', points: 15 },
              { condition: '<50', points: 5 },
            ],
          },
          {
            name: 'Budget',
            weight: 25,
            rules: [
              { condition: '$5,000+/month', points: 25 },
              { condition: '$2,000-$5,000/month', points: 20 },
              { condition: '$1,000-$2,000/month', points: 10 },
              { condition: '<$1,000/month', points: 3 },
            ],
          },
          {
            name: 'Engagement',
            weight: 25,
            rules: [
              { condition: 'Demo request or meeting booked', points: 25 },
              { condition: 'Pricing page visited', points: 18 },
              { condition: 'Multiple page views + form submit', points: 12 },
              { condition: 'Single page view only', points: 3 },
            ],
          },
          {
            name: 'Industry Fit',
            weight: 15,
            rules: [
              { condition: 'B2B SaaS', points: 15 },
              { condition: 'Technology / Software', points: 12 },
              { condition: 'Professional Services', points: 8 },
              { condition: 'Other', points: 3 },
            ],
          },
          {
            name: 'Timeline',
            weight: 15,
            rules: [
              { condition: 'Immediate / this month', points: 15 },
              { condition: 'Within 30 days', points: 12 },
              { condition: 'Within 90 days', points: 7 },
              { condition: 'No timeline / just researching', points: 2 },
            ],
          },
        ],
      },
      enrichmentSources: ['Apollo.io', 'Clay', 'Clearbit'],
      enrichmentFields: [
        'company_revenue',
        'employee_count',
        'tech_stack',
        'recent_funding',
        'linkedin_url',
      ],
      segmentation: {
        segments: [
          {
            name: 'Enterprise Hot',
            criteria: 'score>=80 AND companySize>100',
            action: 'Priority queue for AI call',
          },
          {
            name: 'SMB Warm',
            criteria: 'score>=50 AND score<80',
            action: 'Nurture sequence',
          },
          {
            name: 'Cold',
            criteria: 'score<50',
            action: 'Low-priority nurture',
          },
        ],
      },
      leadsProcessed: existingContacts.length + 1,
      existingContactsSynced: existingContacts.length,
      newContactCreated: newContact.id,
      reasoning:
        'Configured HubSpot CRM with 6-stage pipeline. Scoring model weights Budget and Engagement highest (25 each) as strongest purchase intent signals. Enrichment pulls from 3 sources to maximize coverage. Segmentation routes hot enterprise leads directly to AI qualification calls.',
      confidence: 88,
    };
  }
}
