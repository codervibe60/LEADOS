import { BaseAgent } from '../base-agent';
import { ServiceResearchAgent } from './service-research';
import { OfferEngineeringAgent } from './offer-engineering';
import { ValidationAgent } from './validation';
import { FunnelBuilderAgent } from './funnel-builder';
import { ContentCreativeAgent } from './content-creative';
import { PaidTrafficAgent } from './paid-traffic';
import { OutboundOutreachAgent } from './outbound-outreach';
import { InboundCaptureAgent } from './inbound-capture';
import { AIQualificationAgent } from './ai-qualification';
import { SalesRoutingAgent } from './sales-routing';
import { TrackingAttributionAgent } from './tracking-attribution';
import { PerformanceOptimizationAgent } from './performance-optimization';
import { CRMHygieneAgent } from './crm-hygiene';

export function createLeadOSAgents(): Map<string, BaseAgent> {
  const agents = new Map<string, BaseAgent>();

  agents.set('service-research', new ServiceResearchAgent());
  agents.set('offer-engineering', new OfferEngineeringAgent());
  agents.set('validation', new ValidationAgent());
  agents.set('funnel-builder', new FunnelBuilderAgent());
  agents.set('content-creative', new ContentCreativeAgent());
  agents.set('paid-traffic', new PaidTrafficAgent());
  agents.set('outbound-outreach', new OutboundOutreachAgent());
  agents.set('inbound-capture', new InboundCaptureAgent());
  agents.set('ai-qualification', new AIQualificationAgent());
  agents.set('sales-routing', new SalesRoutingAgent());
  agents.set('tracking-attribution', new TrackingAttributionAgent());
  agents.set('performance-optimization', new PerformanceOptimizationAgent());
  agents.set('crm-hygiene', new CRMHygieneAgent());

  return agents;
}
