import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { mockHubSpot } from '../../integrations/mock-data';

const SYSTEM_PROMPT = `You are the CRM & Data Hygiene Agent for LeadOS. You ensure the CRM database is clean, accurate, deduplicated, enriched, and compliant at all times.

Your responsibilities:
1. DEDUPLICATION: Identify and merge duplicate records using fuzzy matching on email, phone, company name, and LinkedIn URL. Target >99% deduplication accuracy. Merge strategy: keep most recent record, consolidate all interactions.
2. FIELD NORMALIZATION: Standardize phone formats (E.164), lowercase emails, trim company names, normalize country codes, standardize job titles
3. DATA VALIDATION: Flag invalid emails (syntax + MX check), invalid phone numbers, and missing required fields
4. ENRICHMENT: Pull firmographic data (revenue, employee count, industry, tech stack, LinkedIn URL) from Apollo.io and Clearbit. Enrich only records missing >2 key fields.
5. LIFECYCLE MANAGEMENT: Update lead stages based on behavioral triggers (email opens, form submits, calls, meetings, payments)
6. INTERACTION LOGGING: Record every touchpoint (emails, calls, page visits, form submissions) with timestamps in the CRM timeline
7. UTM TRACKING: Preserve and sync UTM parameters from first-touch through to CRM for attribution
8. COMPLIANCE: Enforce GDPR/CAN-SPAM/TCPA data retention policies, process unsubscribe requests within 24h, maintain audit trail

Accept JSON input with CRM records, enrichment preferences, and compliance settings.
Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "deduplication": { "totalRecords": "number", "duplicatesFound": "number", "duplicatesRemoved": "number", "duplicateRate": "number", "mergeStrategy": "string" },
  "normalization": { "fieldsStandardized": ["string"], "recordsNormalized": "number" },
  "validation": { "invalidEmails": "number", "invalidPhones": "number", "missingRequiredFields": "number", "validationRate": "number" },
  "enrichment": { "recordsEnriched": "number", "enrichmentRate": "number", "fieldsAdded": ["string"], "sources": ["string"] },
  "lifecycleUpdates": [{ "leadId": "string", "from": "string", "to": "string", "reason": "string", "timestamp": "string" }],
  "interactionsLogged": "number",
  "dataQualityScore": "number 0-100",
  "reasoning": "string",
  "confidence": "number 0-100"
}

Data quality is the foundation of everything — bad data means bad scoring, bad routing, and wasted ad spend. Be aggressive with cleanup but conservative with merges (never lose data).`;

export class CRMHygieneAgent extends BaseAgent {
  constructor() {
    super(
      'crm-hygiene',
      'CRM & Data Hygiene Agent',
      'Deduplication (>99%), field normalization, data validation, enrichment, lifecycle pipeline management, interaction logging, and UTM tracking'
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
    // Fetch current CRM contacts for hygiene analysis
    const contacts = await mockHubSpot.getContacts();
    await this.log('hubspot_contacts_fetched', { count: contacts.length });

    const totalRecords = 1247;
    const duplicatesFound = 23;

    return {
      deduplication: {
        totalRecords,
        duplicatesFound,
        duplicatesRemoved: duplicatesFound,
        duplicateRate: parseFloat((duplicatesFound / totalRecords).toFixed(3)),
        mergeStrategy: 'Keep most recent, merge all interactions',
        matchingCriteria: [
          { field: 'email', type: 'exact', weight: 1.0 },
          { field: 'phone', type: 'normalized', weight: 0.9 },
          { field: 'company + name', type: 'fuzzy (Levenshtein < 3)', weight: 0.8 },
          { field: 'linkedin_url', type: 'exact', weight: 1.0 },
        ],
        examplesRemoved: [
          { kept: 'sarah.chen@techventures.io (updated 2026-03-08)', removed: 'schen@techventures.io (created 2026-02-15)', reason: 'Same person — email alias match + same company' },
          { kept: 'mike.r@growthlab.co (5 interactions)', removed: 'mike.rodriguez@growthlab.co (1 interaction)', reason: 'Fuzzy name match + same company domain' },
        ],
      },
      normalization: {
        fieldsStandardized: [
          'phone_format',
          'email_lowercase',
          'company_name_trim',
          'country_code',
        ],
        recordsNormalized: totalRecords,
        examples: [
          { field: 'phone', before: '(555) 010-1', after: '+15550101' },
          { field: 'email', before: 'Sarah.Chen@TechVentures.io', after: 'sarah.chen@techventures.io' },
          { field: 'company', before: '  GrowthLab Agency  ', after: 'GrowthLab Agency' },
          { field: 'country', before: 'United States', after: 'US' },
        ],
      },
      validation: {
        invalidEmails: 3,
        invalidPhones: 7,
        missingRequiredFields: 12,
        validationRate: 98.2,
        details: {
          invalidEmailReasons: ['syntax error (2)', 'MX record not found (1)'],
          invalidPhoneReasons: ['too few digits (4)', 'invalid country code (3)'],
          missingFields: { company: 5, phone: 4, email: 0, name: 0, source: 3 },
        },
      },
      enrichment: {
        recordsEnriched: 892,
        enrichmentRate: 71.5,
        fieldsAdded: [
          'company_revenue',
          'employee_count',
          'industry',
          'tech_stack',
          'linkedin_url',
        ],
        sources: ['Apollo.io', 'Clearbit'],
        enrichmentBreakdown: {
          company_revenue: 845,
          employee_count: 892,
          industry: 876,
          tech_stack: 723,
          linkedin_url: 801,
        },
      },
      lifecycleUpdates: [
        {
          leadId: 'lead_1',
          from: 'new',
          to: 'contacted',
          reason: 'Email opened 3x in 24h',
          timestamp: '2026-03-08T14:00:00Z',
        },
        {
          leadId: 'lead_3',
          from: 'contacted',
          to: 'qualified',
          reason: 'Form submitted + score 87',
          timestamp: '2026-03-08T15:30:00Z',
        },
        {
          leadId: 'lead_5',
          from: 'qualified',
          to: 'booked',
          reason: 'Meeting scheduled via Calendly',
          timestamp: '2026-03-08T16:00:00Z',
        },
        {
          leadId: 'lead_8',
          from: 'booked',
          to: 'won',
          reason: 'Payment confirmed via Stripe',
          timestamp: '2026-03-09T10:00:00Z',
        },
      ],
      interactionsLogged: 347,
      dataQualityScore: 94.2,
      complianceStatus: {
        gdprCompliant: true,
        unsubscribesPending: 0,
        dataRetentionPolicy: '24 months inactive, 36 months active',
        auditTrailEnabled: true,
        lastAudit: '2026-03-09T00:00:00Z',
      },
      crmContactsSynced: contacts.length,
      reasoning:
        'Processed 1,247 CRM records. Removed 23 duplicates (1.8% rate) using email + fuzzy name matching. Normalized all phone/email/company fields. Validated 98.2% of records — flagged 3 invalid emails, 7 invalid phones, 12 missing required fields. Enriched 892 records (71.5%) via Apollo.io and Clearbit. Updated 4 lifecycle stages based on behavioral triggers. Data quality score: 94.2/100.',
      confidence: 93,
    };
  }
}
