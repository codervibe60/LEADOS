import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import * as hubspot from '../../integrations/hubspot';
import * as apolloApi from '../../integrations/apollo';
import * as clearbit from '../../integrations/clearbit';

const SYSTEM_PROMPT = `You are the CRM & Data Hygiene Agent for LeadOS — the Service Acquisition Machine. You are the data guardian. Clean data = accurate scoring = better routing = higher close rates. You run 24/7 keeping the CRM pristine.

You MUST use data from previous agents when available:
- From Inbound Capture (agent 8): New leads to normalize and deduplicate
- From AI Qualification (agent 9): Call transcripts and BANT scores to log as interactions
- From Sales Routing (agent 10): Stage assignments and rep ownership
- From Tracking & Attribution (agent 11): UTM parameters and touchpoint data to stitch
- From Performance Optimization (agent 12): Campaign performance data for attribution

RESPONSIBILITY 1: DEDUPLICATION
- Fuzzy match on email, phone, company+name, LinkedIn URL
- Target >99% deduplication accuracy
- Merge strategy: keep most recent, consolidate all interactions
- Track matching criteria with confidence weights

RESPONSIBILITY 2: FIELD NORMALIZATION
- Phone: E.164 format (+1XXXXXXXXXX)
- Email: lowercase, trim whitespace
- Company: trim, standardize suffixes (Inc → Inc.)
- Country: ISO 3166-1 alpha-2 codes
- Job titles: standardize to canonical forms

RESPONSIBILITY 3: DATA VALIDATION
- Email: syntax check + MX record verification
- Phone: digit count + country code validation
- Required fields: name, email, company, source
- Flag and quarantine invalid records

RESPONSIBILITY 4: ENRICHMENT
- Pull firmographic data from Apollo.io and Clearbit
- Fields: revenue, employee count, industry, tech stack, LinkedIn URL
- Only enrich records missing >2 key fields
- Track enrichment sources and timestamps

RESPONSIBILITY 5: LIFECYCLE MANAGEMENT
- Auto-assign stages based on behavioral triggers
- Stages: new → contacted → engaged → qualified → booked → won → churned
- Event triggers: email open, form submit, call completed, meeting booked, payment confirmed
- Log every stage transition with reason and timestamp

RESPONSIBILITY 6: INTERACTION LOGGING
- Record every touchpoint: emails, calls, page visits, form submissions, ad clicks
- Include timestamps, channels, content summaries
- Build complete lead journey timeline

RESPONSIBILITY 7: COMPLIANCE
- GDPR: right to erasure, data portability, consent tracking
- CAN-SPAM: unsubscribe processing within 24h
- TCPA: consent verification before voice calls
- Data retention: configurable policies, automated enforcement
- Complete audit trail of all data access and modifications

Return ONLY valid JSON (no markdown, no explanation outside JSON).

Data quality is the foundation of everything — bad data means bad scoring, bad routing, and wasted ad spend. Be aggressive with cleanup but conservative with merges (never lose data).

CRITICAL DATA INTEGRITY RULE: Do NOT generate projected, estimated, or fabricated metrics. Deduplication rules, normalization rules, validation checks, enrichment config, lifecycle management rules, and compliance policies are strategic outputs and are expected. However, for any counts or statistics (duplicates found, records normalized, fields enriched, etc.): ONLY report numbers from real CRM data (HubSpot contacts) or real enrichment API responses (Apollo/Clearbit) provided in the input. If no real CRM data exists, set all counts to 0. Do NOT invent fictional contact records, deduplication results, or enrichment outcomes. Never fabricate numbers that look like measured data.`;

export class CRMHygieneAgent extends BaseAgent {
  constructor() {
    super(
      'crm-hygiene',
      'CRM & Data Hygiene Agent',
      'Deduplication (>99%), field normalization, data validation, enrichment, lifecycle pipeline management, interaction logging, and compliance enforcement'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    try {
      const previousOutputs = inputs.previousOutputs || {};
      const inboundData = previousOutputs['inbound-capture'] || {};
      const qualificationData = previousOutputs['ai-qualification'] || {};
      const routingData = previousOutputs['sales-routing'] || {};
      const trackingData = previousOutputs['tracking-attribution'] || {};
      const perfData = previousOutputs['performance-optimization'] || {};
      const validationData = previousOutputs['validation'] || {};

      // NO-GO gate
      if (validationData.decision === 'NO-GO') {
        this.status = 'done';
        return {
          success: false,
          data: { skipped: true, reason: 'Validation agent returned NO-GO decision' },
          reasoning: 'CRM hygiene skipped — upstream validation rejected this opportunity.',
          confidence: 100,
        };
      }

      // Fetch real CRM data if available
      let realContacts: any[] = [];
      let enrichedCount = 0;

      if (hubspot.isHubSpotAvailable()) {
        try {
          await this.log('hubspot_fetch', { phase: 'Fetching real CRM contacts for hygiene analysis' });
          realContacts = await hubspot.getContacts();
          await this.log('hubspot_fetched', { contacts: realContacts.length });
        } catch (err: any) {
          await this.log('hubspot_fetch_failed', { error: err.message });
        }
      }

      // Enrich contacts missing key fields
      if (realContacts.length > 0) {
        const contactsToEnrich = realContacts
          .filter((c: any) => !c.properties?.industry || !c.properties?.company_size)
          .slice(0, 10); // Limit to 10 per run to conserve API credits

        if (apolloApi.isApolloAvailable() && contactsToEnrich.length > 0) {
          try {
            await this.log('apollo_enrichment', { phase: 'Enriching contacts via Apollo.io', count: contactsToEnrich.length });
            const emails = contactsToEnrich.map((c: any) => c.properties?.email).filter(Boolean);
            const enrichResults = await apolloApi.bulkEnrich(emails);
            enrichedCount += enrichResults.length;
            await this.log('apollo_enriched', { enriched: enrichResults.length });

            // Push enriched data back to HubSpot
            if (hubspot.isHubSpotAvailable()) {
              for (const result of enrichResults) {
                const contact = contactsToEnrich.find((c: any) => c.properties?.email === result.email);
                if (contact?.id) {
                  try {
                    await hubspot.updateContact(contact.id, {
                      industry: result.industry,
                      company: result.companyName,
                      jobtitle: result.title,
                    });
                  } catch { /* skip failed updates */ }
                }
              }
            }
          } catch (err: any) {
            await this.log('apollo_enrichment_failed', { error: err.message });
          }
        }

        if (clearbit.isClearbitAvailable() && contactsToEnrich.length > 0) {
          try {
            await this.log('clearbit_enrichment', { phase: 'Enriching companies via Clearbit' });
            const domains = contactsToEnrich
              .map((c: any) => c.properties?.email?.split('@')[1])
              .filter((d: string) => d && !d.includes('gmail') && !d.includes('yahoo') && !d.includes('hotmail'));
            const uniqueDomains = [...new Set(domains)].slice(0, 5);

            for (const domain of uniqueDomains) {
              try {
                await clearbit.enrichCompany(domain);
                enrichedCount++;
              } catch { /* skip */ }
            }
            await this.log('clearbit_enriched', { domains: uniqueDomains.length });
          } catch (err: any) {
            await this.log('clearbit_enrichment_failed', { error: err.message });
          }
        }
      }

      const userMessage = JSON.stringify({
        serviceNiche: inputs.config?.niche || inputs.config?.serviceNiche || 'B2B SaaS Lead Generation',
        ...inputs.config,
        realCrmData: {
          totalContacts: realContacts.length > 0 ? realContacts.length : undefined,
          contactsSample: realContacts.slice(0, 5).map((c: any) => ({
            email: c.properties?.email,
            company: c.properties?.company,
            stage: c.properties?.lifecyclestage,
          })),
          enrichedThisRun: enrichedCount > 0 ? enrichedCount : undefined,
        },
        upstreamContext: {
          newLeads: inboundData.leads?.length || inboundData.summary?.totalCaptured || 0,
          qualificationCalls: qualificationData.calls?.length || qualificationData.summary?.totalCalls || 0,
          routedLeads: routingData.routedLeads?.length || routingData.summary?.totalRouted || 0,
          channelAttribution: trackingData.channelAttribution || null,
          campaignPerformance: perfData.campaignAnalysis?.length || 0,
        },
      });

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage);
      const parsed = this.safeParseLLMJson<any>(response, ['deduplication', 'normalization']);

      // Force-zero ALL LLM-fabricated statistics — only real CRM/API data counts
      const hasRealCrmData = realContacts.length > 0;

      // Deduplication stats — no real dedup was performed in code, LLM fabricates these
      if (parsed.deduplication) {
        if (parsed.deduplication.duplicatesFound !== undefined) parsed.deduplication.duplicatesFound = 0;
        if (parsed.deduplication.duplicatesMerged !== undefined) parsed.deduplication.duplicatesMerged = 0;
        if (parsed.deduplication.totalRecordsScanned !== undefined) parsed.deduplication.totalRecordsScanned = hasRealCrmData ? realContacts.length : 0;
        if (parsed.deduplication.summary) {
          Object.keys(parsed.deduplication.summary).forEach(k => { if (typeof parsed.deduplication.summary[k] === 'number') parsed.deduplication.summary[k] = 0; });
        }
      }

      // Normalization stats — no real normalization was performed
      if (parsed.normalization) {
        if (parsed.normalization.recordsNormalized !== undefined) parsed.normalization.recordsNormalized = 0;
        if (parsed.normalization.fieldsUpdated !== undefined) parsed.normalization.fieldsUpdated = 0;
        if (parsed.normalization.summary) {
          Object.keys(parsed.normalization.summary).forEach(k => { if (typeof parsed.normalization.summary[k] === 'number') parsed.normalization.summary[k] = 0; });
        }
      }

      // Validation stats — no real validation was performed
      if (parsed.validation) {
        if (parsed.validation.totalValidated !== undefined) parsed.validation.totalValidated = 0;
        if (parsed.validation.invalidRecords !== undefined) parsed.validation.invalidRecords = 0;
        if (parsed.validation.quarantined !== undefined) parsed.validation.quarantined = 0;
        if (parsed.validation.summary) {
          Object.keys(parsed.validation.summary).forEach(k => { if (typeof parsed.validation.summary[k] === 'number') parsed.validation.summary[k] = 0; });
        }
      }

      // Enrichment stats — only real if APIs were connected
      const apolloAvailable = !!process.env.APOLLO_API_KEY;
      const clearbitAvailable = !!process.env.CLEARBIT_API_KEY;
      if (parsed.enrichment) {
        if (!apolloAvailable && !clearbitAvailable) {
          if (parsed.enrichment.totalEnriched !== undefined) parsed.enrichment.totalEnriched = 0;
          if (parsed.enrichment.averageCompletenessScore !== undefined) parsed.enrichment.averageCompletenessScore = 0;
          if (parsed.enrichment.summary) {
            Object.keys(parsed.enrichment.summary).forEach(k => { if (typeof parsed.enrichment.summary[k] === 'number') parsed.enrichment.summary[k] = 0; });
          }
        } else {
          // Real enrichment happened — use actual count
          if (parsed.enrichment.totalEnriched !== undefined) parsed.enrichment.totalEnriched = enrichedCount;
        }
      }

      // Overall summary — force to real counts
      if (parsed.summary) {
        Object.keys(parsed.summary).forEach(k => {
          if (typeof parsed.summary[k] === 'number') parsed.summary[k] = 0;
        });
        // Set real values we actually know
        parsed.summary.totalContacts = hasRealCrmData ? realContacts.length : 0;
        parsed.summary.totalEnriched = enrichedCount;
      }

      this.status = 'done';
      await this.log('run_completed', { output: parsed });
      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || 'CRM hygiene analysis complete.',
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
