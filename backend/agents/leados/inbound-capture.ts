import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import * as hubspot from '../../integrations/hubspot';
import * as apolloApi from '../../integrations/apollo';
import * as clearbit from '../../integrations/clearbit';
import { filterBlacklisted } from '../../utils/blacklist';

const SYSTEM_PROMPT = `You are the Inbound Lead Capture Agent for LeadOS — the central hub that receives, scores, enriches, and segments every lead entering the system from all channels.

You MUST use data from previous agents when available:
- From Offer Engineering (agent 2): ICP definition, pain points, pricing tiers
- From Funnel Builder (agent 4): Form fields, landing page URLs, CRM setup
- From Paid Traffic (agent 6): Ad campaigns, UTM parameters, channel data
- From Outbound Outreach (agent 7): Email replies, LinkedIn conversations, prospect lists

RESPONSIBILITY 1: CRM INTEGRATION
- Configure HubSpot/GoHighLevel pipeline stages and custom properties
- Set up webhook receivers for all inbound sources (forms, chat, ads, email replies)
- Map UTM parameters to lead source attribution
- Auto-create contacts with deduplication (email + company match)

RESPONSIBILITY 2: LEAD SCORING (100-point model)
Apply weighted scoring across these factors:
- Company Fit (20pts): company size, industry match, revenue range vs ICP
- Budget Signal (25pts): stated budget, pricing page visits, plan tier interest
- Engagement Level (25pts): form submissions, page views, email opens/replies, demo requests
- Industry Match (15pts): how closely the lead's industry matches the ICP
- Timeline Urgency (15pts): stated timeline, urgency language, seasonal buying patterns

RESPONSIBILITY 3: DATA ENRICHMENT
- Pull firmographic data: company revenue, employee count, funding status, tech stack
- Pull contact data: LinkedIn URL, phone, job title, decision-making authority
- Sources: Apollo.io (primary), Clay (firmographic), Clearbit (technographic)
- Enrichment completeness score per lead

RESPONSIBILITY 4: SEGMENTATION
- Enterprise Hot (score >= 80): Route to AI Qualification call immediately
- Mid-Market Warm (score 60-79): Schedule nurture + soft booking push
- SMB Interested (score 40-59): Add to email nurture sequence
- Cold/Unqualified (score < 40): Low-priority drip, re-engage in 30 days

RESPONSIBILITY 5: WEBHOOK PROCESSING
- Process form submissions from landing pages
- Capture chat widget conversations
- Handle ad platform lead form submissions (Google Lead Forms, Meta Lead Ads)
- Process email replies forwarded from outbound campaigns
- Capture LinkedIn conversation exports

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "crmSetup": {
    "provider": "string",
    "pipelineStages": [{ "name": "string", "order": "number", "autoActions": ["string"] }],
    "customProperties": [{ "name": "string", "type": "string", "description": "string" }],
    "webhookEndpoints": [{ "source": "string", "url": "string", "events": ["string"] }]
  },
  "scoringModel": {
    "maxScore": 100,
    "factors": [{
      "name": "string",
      "weight": "number",
      "rules": [{ "condition": "string", "points": "number" }]
    }],
    "qualificationThreshold": "number"
  },
  "enrichment": {
    "sources": [{ "provider": "string", "dataPoints": ["string"], "priority": "number" }],
    "fieldsEnriched": ["string"],
    "averageCompletenessScore": "number (percentage)"
  },
  "segmentation": {
    "segments": [{
      "name": "string",
      "scoreRange": "string",
      "criteria": "string",
      "count": "number",
      "action": "string",
      "routeTo": "string"
    }]
  },
  "leadsProcessed": [{
    "name": "string",
    "email": "string",
    "company": "string",
    "source": "string",
    "channel": "string",
    "score": "number",
    "segment": "string",
    "stage": "string",
    "enrichmentStatus": "complete|partial|pending",
    "enrichedData": {
      "companyRevenue": "string",
      "employeeCount": "number",
      "techStack": ["string"],
      "fundingStatus": "string",
      "linkedInUrl": "string",
      "decisionMaker": "boolean"
    },
    "scoreBreakdown": {
      "companyFit": "number",
      "budgetSignal": "number",
      "engagement": "number",
      "industryMatch": "number",
      "timeline": "number"
    }
  }],
  "channelBreakdown": [{
    "channel": "string",
    "leadsCount": "number",
    "avgScore": "number",
    "topSegment": "string"
  }],
  "summary": {
    "totalLeadsProcessed": "number",
    "totalEnriched": "number",
    "avgLeadScore": "number",
    "hotLeads": "number",
    "warmLeads": "number",
    "coldLeads": "number",
    "duplicatesRemoved": "number"
  },
  "reasoning": "string",
  "confidence": "number 0-100"
}

Score leads objectively. Prioritize accuracy over volume — false positives waste sales time, false negatives lose revenue.

CRITICAL DATA INTEGRITY RULE: Do NOT generate projected, estimated, or fabricated metrics. CRM setup, scoring model, enrichment config, and segmentation rules are strategic outputs and are expected. However, for leadsProcessed: ONLY include real leads from the database or real API data provided in the input. If no real leads exist, return an empty leadsProcessed array. For summary fields (totalLeadsProcessed, totalEnriched, avgLeadScore, hotLeads, warmLeads, coldLeads, duplicatesRemoved): only count real leads — set to 0 if no real data. For channelBreakdown: only include channels with real lead data — set counts to 0 if unmeasured. For enrichedData: only include data from real Apollo/Clearbit API responses. Never invent fictional leads, companies, enrichment results, or metrics.`;

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
      // Extract upstream agent data
      const previousOutputs = inputs.previousOutputs || {};
      const offerData = previousOutputs['offer-engineering'] || {};
      const funnelData = previousOutputs['funnel-builder'] || {};
      const paidTrafficData = previousOutputs['paid-traffic'] || {};
      const outboundData = previousOutputs['outbound-outreach'] || {};
      const validationData = previousOutputs['validation'] || {};

      // Check if validation said NO-GO
      if (validationData.decision === 'NO-GO') {
        this.status = 'done';
        return {
          success: false,
          data: { skipped: true, reason: 'Validation agent returned NO-GO decision' },
          reasoning: 'Inbound capture skipped — upstream validation rejected this opportunity.',
          confidence: 100,
        };
      }

      // Fetch real leads from database first
      let dbLeads: any[] = [];
      try {
        const { prisma } = await import('@/lib/prisma');
        dbLeads = await prisma.lead.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { interactions: true },
        });
        if (dbLeads.length > 0) {
          await this.log('db_leads_fetched', { count: dbLeads.length });
        }
      } catch (err: any) {
        await this.log('db_leads_error', { error: err.message });
      }

      // Fetch real data from integrations when available
      let realHubSpotContacts: any[] = [];
      let realEnrichments: Map<string, any> = new Map();
      const enrichmentSources: string[] = [];

      // Pull existing contacts from HubSpot
      if (hubspot.isHubSpotAvailable()) {
        try {
          realHubSpotContacts = await hubspot.getContacts(100);
          await this.log('hubspot_real_contacts', { count: realHubSpotContacts.length });
          enrichmentSources.push('hubspot');
        } catch (err: any) {
          await this.log('hubspot_error', { error: err.message });
        }
      }

      // Enrich leads via Apollo
      if (apolloApi.isApolloAvailable()) {
        try {
          const emailsToEnrich = [
            ...(outboundData.prospectList || []).map((p: any) => p.email),
            ...realHubSpotContacts.map((c) => c.email),
          ].filter(Boolean).slice(0, 20);

          if (emailsToEnrich.length > 0) {
            const enriched = await apolloApi.bulkEnrich(emailsToEnrich);
            for (const e of enriched) {
              realEnrichments.set(e.email, {
                companyRevenue: e.companyRevenue,
                employeeCount: e.employeeCount,
                techStack: e.techStack,
                fundingStatus: e.fundingStatus,
                linkedInUrl: e.linkedInUrl,
                decisionMaker: e.decisionMaker,
              });
            }
            await this.log('apollo_enrichment_done', { enriched: enriched.length });
            enrichmentSources.push('apollo');
          }
        } catch (err: any) {
          await this.log('apollo_enrichment_error', { error: err.message });
        }
      }

      // Enrich company data via Clearbit
      if (clearbit.isClearbitAvailable()) {
        try {
          const domains = new Set<string>();
          for (const contact of realHubSpotContacts) {
            const domain = contact.email?.split('@')[1];
            if (domain) domains.add(domain);
          }
          for (const domain of Array.from(domains).slice(0, 10)) {
            try {
              const company = await clearbit.enrichCompany(domain);
              // Store by domain for lookup
              realEnrichments.set(`domain:${domain}`, {
                companyRevenue: company.annualRevenue,
                employeeCount: company.employeeCount,
                techStack: company.techStack,
                fundingStatus: company.fundingTotal,
                industry: company.industry,
              });
            } catch { /* skip individual failures */ }
          }
          await this.log('clearbit_enrichment_done', { domains: domains.size });
          enrichmentSources.push('clearbit');
        } catch (err: any) {
          await this.log('clearbit_error', { error: err.message });
        }
      }

      // Format real DB leads for the LLM context
      const realLeadsForContext = dbLeads.length > 0
        ? dbLeads.map((l: any) => ({
            name: l.name,
            email: l.email,
            company: l.company,
            phone: l.phone,
            source: l.source,
            channel: l.channel || 'inbound',
            score: l.score,
            stage: l.stage,
            segment: l.segment,
            utmSource: l.utmSource,
            utmMedium: l.utmMedium,
            utmCampaign: l.utmCampaign,
            interactionCount: l.interactions?.length || 0,
            createdAt: l.createdAt,
          }))
        : null;

      const userMessage = JSON.stringify({
        serviceNiche: inputs.config?.niche || inputs.config?.serviceNiche || 'B2B SaaS Lead Generation',
        ...inputs.config,
        upstreamContext: {
          icp: offerData.icp || offerData.idealCustomerProfile || null,
          painPoints: offerData.painPoints || null,
          funnelSetup: funnelData.landingPage ? { formFields: funnelData.leadCaptureForm?.fields, bookingIntegration: funnelData.bookingIntegration } : null,
          adCampaigns: paidTrafficData.googleAds || paidTrafficData.metaAds ? { google: !!paidTrafficData.googleAds, meta: !!paidTrafficData.metaAds } : null,
          outboundProspects: outboundData.prospectList || outboundData.coldEmail?.prospectCount || null,
        },
        realLeadsFromDatabase: realLeadsForContext,
        IMPORTANT_INSTRUCTION: realLeadsForContext
          ? 'USE ONLY the real leads from realLeadsFromDatabase. Do NOT invent or generate fictional leads. Score and enrich these real leads only.'
          : null,
        realData: {
          hubspotContacts: realHubSpotContacts.length > 0 ? realHubSpotContacts.length : null,
          enrichedLeads: realEnrichments.size > 0 ? realEnrichments.size : null,
          enrichmentSources: enrichmentSources.length > 0 ? enrichmentSources : null,
          dataSource: dbLeads.length > 0 ? 'database' : enrichmentSources.length > 0 ? 'live_apis' : 'llm_generated',
        },
      });

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage);
      const parsed = this.safeParseLLMJson<any>(response, ['crmSetup', 'scoringModel', 'segmentation']);

      // Force-zero ALL LLM-fabricated numeric metrics in summary
      // Only real DB data counts
      const realLeadCount = dbLeads.length;
      if (parsed.summary) {
        parsed.summary.totalLeadsCaptured = realLeadCount;
        parsed.summary.totalLeadsProcessed = realLeadCount;
        parsed.summary.totalEnriched = realEnrichments.size > 0 ? realEnrichments.size : 0;
        parsed.summary.avgLeadScore = 0; // Will be computed from real scores below
        parsed.summary.hotLeads = 0;
        parsed.summary.warmLeads = 0;
        parsed.summary.coldLeads = 0;
        parsed.summary.duplicatesRemoved = 0; // No real dedup was performed
      }

      // Zero enrichment averageCompletenessScore — LLM fabrication
      if (parsed.enrichment?.averageCompletenessScore !== undefined) {
        parsed.enrichment.averageCompletenessScore = realEnrichments.size > 0 ? parsed.enrichment.averageCompletenessScore : 0;
      }

      // Zero channelBreakdown counts — must come from real data
      if (parsed.channelBreakdown) {
        for (const ch of parsed.channelBreakdown) {
          ch.leadsCount = 0;
          ch.avgScore = 0;
        }
      }

      // Zero segmentation segment counts — LLM cannot know real counts
      if (parsed.segmentation?.segments) {
        for (const seg of parsed.segmentation.segments) {
          seg.count = 0;
        }
      }

      // If we have real DB leads, recompute summary from actual data
      if (realLeadCount > 0 && parsed.leadsProcessed?.length > 0) {
        let hot = 0, warm = 0, cold = 0, totalScore = 0;
        for (const lead of parsed.leadsProcessed) {
          const score = lead.score || 0;
          totalScore += score;
          if (score >= 80) hot++;
          else if (score >= 40) warm++;
          else cold++;
        }
        if (parsed.summary) {
          parsed.summary.avgLeadScore = Math.round(totalScore / parsed.leadsProcessed.length);
          parsed.summary.hotLeads = hot;
          parsed.summary.warmLeads = warm;
          parsed.summary.coldLeads = cold;
        }
      }

      // Merge DB lead data (phone, source, etc.) back into LLM output — LLM often drops fields
      if (dbLeads.length > 0 && parsed.leadsProcessed) {
        for (const lead of parsed.leadsProcessed) {
          const dbLead = dbLeads.find((d: any) =>
            d.email === lead.email || (d.name && d.name.toLowerCase() === (lead.name || '').toLowerCase())
          );
          if (dbLead) {
            if (!lead.phone && dbLead.phone) lead.phone = dbLead.phone;
            if (!lead.source && dbLead.source) lead.source = dbLead.source;
            if (!lead.channel && dbLead.channel) lead.channel = dbLead.channel;
          }
        }
      }

      // Merge real enrichment data into LLM output leads
      if (realEnrichments.size > 0 && parsed.leadsProcessed) {
        for (const lead of parsed.leadsProcessed) {
          const enriched = realEnrichments.get(lead.email);
          const domain = lead.email?.split('@')[1];
          const companyData = domain ? realEnrichments.get(`domain:${domain}`) : null;
          if (enriched || companyData) {
            lead.enrichedData = {
              ...lead.enrichedData,
              ...(enriched || {}),
              ...(companyData || {}),
            };
            lead.enrichmentStatus = 'complete';
          }
        }
      }

      // Filter blacklisted companies from processed leads
      if (parsed.leadsProcessed && parsed.leadsProcessed.length > 0) {
        try {
          const { allowed, blocked } = await filterBlacklisted(parsed.leadsProcessed);
          if (blocked.length > 0) {
            await this.log('blacklist_filtered', {
              removed: blocked.length,
              companies: blocked.map((b: any) => b.company),
            });
            // Mark blocked leads as blacklisted in output (don't remove, just flag)
            for (const lead of parsed.leadsProcessed) {
              const isBlocked = blocked.some((b: any) => b.email === lead.email || b.company === lead.company);
              if (isBlocked) {
                lead.blacklisted = true;
                lead.stage = 'lost';
                lead.segment = 'Blacklisted';
                lead.score = 0;
              }
            }
            parsed.blacklistFiltered = blocked.length;
          }
        } catch (err: any) {
          await this.log('blacklist_check_error', { error: err.message });
        }
      }

      // Push scored leads to real HubSpot (skip blacklisted)
      if (hubspot.isHubSpotAvailable() && parsed.leadsProcessed) {
        const leadsToSync = parsed.leadsProcessed.filter((l: any) => !l.blacklisted).slice(0, 20);
        for (const lead of leadsToSync) {
          try {
            await hubspot.upsertContact({
              email: lead.email,
              firstName: lead.name?.split(' ')[0],
              lastName: lead.name?.split(' ').slice(1).join(' '),
              company: lead.company,
              properties: {
                lead_score: String(lead.score || 0),
                lead_segment: lead.segment || '',
                lifecyclestage: lead.score >= 80 ? 'marketingqualifiedlead' : 'lead',
              },
            });
          } catch { /* skip individual CRM failures */ }
        }
        await this.log('hubspot_leads_synced', { count: leadsToSync.length });
      }

      this.status = 'done';
      await this.log('run_completed', { output: parsed });
      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || 'Inbound lead capture system configured and leads processed.',
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
