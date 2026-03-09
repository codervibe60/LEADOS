'use client';

import { TrendingUp, TrendingDown, Target, Shield, Globe, Mail, Phone, Users, DollarSign, BarChart3, CheckCircle2, XCircle, AlertTriangle, Zap, ArrowRight, Star, Megaphone, PenTool, Video, MessageSquare, Search, Filter, Route, Activity, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentOutputRendererProps {
  agentId: string;
  data: any;
}

function ScoreBar({ label, score, max = 100, color = 'indigo' }: { label: string; score: number; max?: number; color?: string }) {
  const pct = Math.min((score / max) * 100, 100);
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-medium text-zinc-200">{score}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800">
        <div className={cn('h-2 rounded-full transition-all', colorMap[color] || colorMap.indigo)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color = 'text-zinc-200' }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={cn('mt-1 text-lg font-semibold', color)}>{value}</p>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
      <Icon className="h-4 w-4 text-indigo-400" />
      {title}
    </h4>
  );
}

function Badge({ children, color = 'zinc' }: { children: React.ReactNode; color?: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    zinc: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', colorMap[color] || colorMap.zinc)}>
      {children}
    </span>
  );
}

// ─── Agent 1: Service Research ───────────────────────────────────────
function ServiceResearchOutput({ data }: { data: any }) {
  const opportunities = data?.opportunities || data?.data?.opportunities || [];
  return (
    <div className="space-y-4">
      <SectionHeader icon={Search} title={`Top ${opportunities.length} Service Opportunities`} />
      {opportunities.map((opp: any, i: number) => (
        <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h5 className="font-medium text-white">{opp.niche}</h5>
              {opp.estimatedMarketSize && <p className="text-xs text-zinc-500">Market size: {opp.estimatedMarketSize}</p>}
            </div>
            <Badge color="indigo">#{i + 1}</Badge>
          </div>
          <div className="mb-3 space-y-2">
            <ScoreBar label="Demand" score={opp.demandScore} color="emerald" />
            <ScoreBar label="Competition (lower is better)" score={opp.competitionScore} color={opp.competitionScore > 60 ? 'red' : 'amber'} />
            <ScoreBar label="Monetization" score={opp.monetizationScore} color="blue" />
          </div>
          <p className="text-xs text-zinc-400">{opp.reasoning}</p>
          {opp.targetPlatforms && (
            <div className="mt-2 flex flex-wrap gap-1">
              {opp.targetPlatforms.map((p: string, j: number) => (
                <Badge key={j} color="zinc">{p}</Badge>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Agent 2: Offer Engineering ──────────────────────────────────────
function OfferEngineeringOutput({ data }: { data: any }) {
  const offer = data?.offer || data?.data?.offer || data;
  const icp = offer?.icp;
  return (
    <div className="space-y-4">
      {offer?.transformationPromise && (
        <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-4 text-center">
          <p className="text-xs text-indigo-400">Transformation Promise</p>
          <p className="mt-1 text-sm font-semibold text-white">&quot;{offer.transformationPromise}&quot;</p>
        </div>
      )}
      {icp && (
        <>
          <SectionHeader icon={Target} title="Ideal Customer Profile (ICP)" />
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-sm text-zinc-300">{typeof icp === 'string' ? icp : icp.description || JSON.stringify(icp)}</p>
            {icp.companySize && <p className="mt-1 text-xs text-zinc-500">Company size: {icp.companySize} | Revenue: {icp.revenue}</p>}
          </div>
        </>
      )}
      {offer?.painPoints && (
        <>
          <SectionHeader icon={AlertTriangle} title="Pain Points" />
          <ul className="space-y-1.5">
            {offer.painPoints.map((p: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                {p}
              </li>
            ))}
          </ul>
        </>
      )}
      {offer?.pricingTiers && (
        <>
          <SectionHeader icon={DollarSign} title="Pricing Tiers" />
          <div className="grid gap-3 sm:grid-cols-3">
            {offer.pricingTiers.map((tier: any, i: number) => (
              <div key={i} className={cn('rounded-lg border p-3', i === 1 ? 'border-indigo-500 bg-indigo-950/10' : 'border-zinc-800 bg-zinc-900/50')}>
                <p className="text-xs font-medium text-zinc-400">{tier.name}</p>
                <p className="mt-1 text-lg font-bold text-white">${tier.price?.toLocaleString()}<span className="text-xs font-normal text-zinc-500">/{tier.billingCycle || 'mo'}</span></p>
                {tier.features && (
                  <ul className="mt-2 space-y-1">
                    {tier.features.map((f: string, j: number) => (
                      <li key={j} className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />{f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {offer?.guarantee && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-3">
          <div className="flex items-center gap-2 text-xs text-emerald-400"><Shield className="h-3.5 w-3.5" />Guarantee</div>
          <p className="mt-1 text-sm text-zinc-200">{offer.guarantee}</p>
        </div>
      )}
    </div>
  );
}

// ─── Agent 3: Validation ─────────────────────────────────────────────
function ValidationOutput({ data }: { data: any }) {
  const d = data?.data || data;
  const isGo = (d?.decision || '').toUpperCase() === 'GO';
  return (
    <div className="space-y-4">
      <div className={cn('flex items-center justify-center gap-3 rounded-lg border p-4', isGo ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-red-500/30 bg-red-950/20')}>
        {isGo ? <CheckCircle2 className="h-8 w-8 text-emerald-400" /> : <XCircle className="h-8 w-8 text-red-400" />}
        <div>
          <p className={cn('text-2xl font-bold', isGo ? 'text-emerald-400' : 'text-red-400')}>{d?.decision || 'N/A'}</p>
          <p className="text-xs text-zinc-400">Validation Decision</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={DollarSign} label="CAC Estimate" value={`$${d?.cacEstimate || d?.scores?.cacEstimate || 0}`} color="text-amber-400" />
        <MetricCard icon={TrendingUp} label="LTV Estimate" value={`$${d?.ltvEstimate || 0}`} color="text-emerald-400" />
        <MetricCard icon={BarChart3} label="LTV/CAC Ratio" value={`${d?.ltvCacRatio || (d?.ltvEstimate && d?.cacEstimate ? (d.ltvEstimate / d.cacEstimate).toFixed(1) : 'N/A')}x`} color="text-blue-400" />
        <MetricCard icon={Shield} label="Risk Score" value={`${d?.riskScore || 0}/100`} color={d?.riskScore < 40 ? 'text-emerald-400' : 'text-red-400'} />
      </div>
      {(d?.scores || d?.demandScore !== undefined) && (
        <div className="space-y-2">
          <SectionHeader icon={BarChart3} title="Validation Scores" />
          <ScoreBar label="Market Demand" score={d?.scores?.marketDemand || d?.demandScore || 0} color="emerald" />
          <ScoreBar label="Competitive Saturation" score={d?.scores?.competitiveSaturation || d?.competitionScore || 0} color="amber" />
          <ScoreBar label="Pricing Feasibility" score={d?.scores?.pricingFeasibility || 90} color="blue" />
        </div>
      )}
      {d?.riskFactors && (
        <>
          <SectionHeader icon={AlertTriangle} title="Risk Factors" />
          {d.riskFactors.map((r: any, i: number) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
              <p className="text-xs font-medium text-zinc-300">{r.factor || r}</p>
              {r.mitigation && <p className="mt-0.5 text-xs text-zinc-500">Mitigation: {r.mitigation}</p>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Agent 4: Funnel Builder ─────────────────────────────────────────
function FunnelBuilderOutput({ data }: { data: any }) {
  const d = data?.data || data;
  const lp = d?.landingPage;
  return (
    <div className="space-y-4">
      {lp && (
        <>
          <SectionHeader icon={Globe} title="Landing Page" />
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <h5 className="text-lg font-bold text-white">{lp.headline}</h5>
            <p className="mt-1 text-sm text-zinc-400">{lp.subheadline}</p>
            {lp.url && <p className="mt-2 text-xs text-indigo-400">{lp.url}</p>}
            {(lp.sections || []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(lp.sections || []).map((s: any, i: number) => (
                  <Badge key={i} color="indigo">{typeof s === 'string' ? s : s.type}</Badge>
                ))}
              </div>
            )}
            {lp.cta && <p className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{lp.cta}</p>}
          </div>
        </>
      )}
      {d?.leadForm && (
        <>
          <SectionHeader icon={Filter} title="Lead Capture Form" />
          <div className="flex flex-wrap gap-2">
            {(d.leadForm.fields || []).map((f: any, i: number) => (
              <Badge key={i} color={f.required ? 'indigo' : 'zinc'}>{typeof f === 'string' ? f : f.name}{f.required && ' *'}</Badge>
            ))}
          </div>
        </>
      )}
      {d?.bookingCalendar && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-xs text-zinc-400">Booking Calendar</p>
          <p className="text-sm text-zinc-200">{d.bookingCalendar.provider} — {d.bookingCalendar.meetingDuration || 30} min meetings</p>
        </div>
      )}
    </div>
  );
}

// ─── Agent 5: Content & Creative ─────────────────────────────────────
function ContentCreativeOutput({ data }: { data: any }) {
  const d = data?.data || data;
  return (
    <div className="space-y-4">
      {d?.hooks && (
        <>
          <SectionHeader icon={Zap} title="Ad Hooks" />
          {d.hooks.map((h: any, i: number) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
              <span className="text-xs text-zinc-500">Hook {i + 1}:</span>
              <p className="text-sm font-medium text-zinc-200">&quot;{typeof h === 'string' ? h : h.text}&quot;</p>
              {h.angle && <Badge color="purple">{h.angle}</Badge>}
            </div>
          ))}
        </>
      )}
      {(d?.adHooks || d?.adCopies) && !d?.hooks && (
        <>
          <SectionHeader icon={Megaphone} title="Ad Copies" />
          {(d.adHooks || []).map((h: string, i: number) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
              <p className="text-sm text-zinc-200">&quot;{h}&quot;</p>
            </div>
          ))}
        </>
      )}
      {d?.emailSequence && (
        <>
          <SectionHeader icon={Mail} title={`Email Sequence (${d.emailSequence.length} emails)`} />
          {d.emailSequence.map((e: any, i: number) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="flex items-center gap-2">
                <Badge color="blue">Email {i + 1}</Badge>
                {e.delay !== undefined && <span className="text-xs text-zinc-500">Day {e.delay}</span>}
              </div>
              <p className="mt-1 text-sm font-medium text-zinc-200">{e.subject}</p>
              {e.body && <p className="mt-1 text-xs text-zinc-400">{e.body.substring(0, 120)}...</p>}
            </div>
          ))}
        </>
      )}
      {d?.linkedInScripts && (
        <>
          <SectionHeader icon={MessageSquare} title="LinkedIn Scripts" />
          <div className="space-y-2">
            {Object.entries(d.linkedInScripts).map(([key, val]: [string, any]) => (
              <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
                <p className="text-xs font-medium text-zinc-400">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                <p className="mt-1 text-sm text-zinc-300">{typeof val === 'string' ? val : JSON.stringify(val)}</p>
              </div>
            ))}
          </div>
        </>
      )}
      {d?.videoAdScripts && (
        <>
          <SectionHeader icon={Video} title="Video Ad Scripts" />
          {d.videoAdScripts.map((v: any, i: number) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="flex items-center gap-2">
                <Badge color="purple">{v.duration || '30s'}</Badge>
              </div>
              {v.hook && <p className="mt-1 text-sm font-medium text-zinc-200">Hook: {v.hook}</p>}
              {v.body && <p className="mt-1 text-xs text-zinc-400">{v.body}</p>}
              {v.cta && <p className="mt-1 text-xs text-indigo-400">CTA: {v.cta}</p>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Agent 6: Paid Traffic ───────────────────────────────────────────
function PaidTrafficOutput({ data }: { data: any }) {
  const d = data?.data || data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard icon={DollarSign} label="Monthly Budget" value={`$${(d?.totalMonthlyBudget || d?.totalBudget || 0).toLocaleString()}`} />
        <MetricCard icon={Target} label="Est. CPL" value={`$${d?.estimatedCPL || 0}`} color="text-emerald-400" />
        {d?.estimatedLeadsPerMonth && <MetricCard icon={Users} label="Est. Leads/mo" value={`${d.estimatedLeadsPerMonth}`} color="text-blue-400" />}
      </div>
      {(d?.campaigns || d?.googleAds) && (
        <>
          <SectionHeader icon={Megaphone} title="Campaigns" />
          {(d?.campaigns || [d?.googleAds, d?.metaAds].filter(Boolean)).map((c: any, i: number) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="flex items-center justify-between">
                <Badge color={c.platform?.includes('Google') || c.campaignId?.startsWith('gads') ? 'blue' : 'purple'}>{c.platform || (c.campaignId?.startsWith('gads') ? 'Google Ads' : 'Meta Ads')}</Badge>
                <span className="text-xs text-zinc-400">${(c.budget || c.dailyBudget || 0).toLocaleString()}{c.dailyBudget ? '/day' : '/mo'}</span>
              </div>
              {c.keywords && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(Array.isArray(c.keywords) ? c.keywords : []).slice(0, 8).map((k: any, j: number) => (
                    <Badge key={j} color="zinc">{typeof k === 'string' ? k : k.keyword}</Badge>
                  ))}
                </div>
              )}
              {c.audiences && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(Array.isArray(c.audiences) ? c.audiences : []).slice(0, 5).map((a: any, j: number) => (
                    <Badge key={j} color="purple">{typeof a === 'string' ? a : a.name}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Agent 7: Outbound Outreach ──────────────────────────────────────
function OutboundOutreachOutput({ data }: { data: any }) {
  const d = data?.data || data;
  const email = d?.coldEmail || d;
  const li = d?.linkedIn || d?.linkedInSequence;
  return (
    <div className="space-y-4">
      {d?.projectedMetrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard icon={Mail} label="Emails Sent" value={`${d.projectedMetrics.emailsSent || 0}`} />
          <MetricCard icon={MessageSquare} label="Expected Replies" value={`${d.projectedMetrics.expectedReplies || 0}`} color="text-emerald-400" />
          <MetricCard icon={Phone} label="Meetings" value={`${d.projectedMetrics.expectedMeetings || 0}`} color="text-indigo-400" />
          <MetricCard icon={Users} label="LinkedIn Connects" value={`${d.projectedMetrics.linkedInConnections || 0}`} color="text-blue-400" />
        </div>
      )}
      {(email?.sequences || d?.emailSequence) && (
        <>
          <SectionHeader icon={Mail} title="Cold Email Sequence" />
          {(email.sequences || d.emailSequence || []).map((s: any, i: number) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">{s.step || i + 1}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-200">{s.subject}</p>
                {s.purpose && <p className="text-xs text-zinc-500">{s.purpose}</p>}
                {s.delay !== undefined && <span className="text-xs text-zinc-500">Delay: {s.delay} days</span>}
              </div>
            </div>
          ))}
        </>
      )}
      {(li?.sequences || (Array.isArray(li) && li.length > 0)) && (
        <>
          <SectionHeader icon={MessageSquare} title="LinkedIn Sequence" />
          {(li.sequences || li || []).map((s: any, i: number) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
              <div className="flex items-center gap-2">
                <Badge color="blue">{s.type || `Step ${s.step || i + 1}`}</Badge>
                {s.delay !== undefined && <span className="text-xs text-zinc-500">Day {s.delay}</span>}
              </div>
              <p className="mt-1 text-sm text-zinc-300">{s.message}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Agent 8: Inbound Capture ────────────────────────────────────────
function InboundCaptureOutput({ data }: { data: any }) {
  const d = data?.data || data;
  return (
    <div className="space-y-4">
      {d?.leadsProcessed && (
        <MetricCard icon={Users} label="Leads Processed" value={`${d.leadsProcessed}`} color="text-emerald-400" />
      )}
      {d?.scoringModel && (
        <>
          <SectionHeader icon={Star} title="Lead Scoring Model" />
          {(d.scoringModel.factors || []).map((f: any, i: number) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-200">{f.name}</p>
                <Badge color="indigo">Weight: {f.weight}</Badge>
              </div>
              {f.rules && (
                <div className="mt-2 space-y-0.5">
                  {f.rules.map((r: any, j: number) => (
                    <p key={j} className="text-xs text-zinc-400">{typeof r === 'string' ? r : `${r.condition}: +${r.points} pts`}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}
      {d?.segmentation?.segments && (
        <>
          <SectionHeader icon={Filter} title="Lead Segments" />
          {d.segmentation.segments.map((s: any, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
              <Badge color={i === 0 ? 'emerald' : i === 1 ? 'amber' : 'zinc'}>{s.name}</Badge>
              <ArrowRight className="h-3 w-3 text-zinc-600" />
              <p className="text-xs text-zinc-400">{s.action}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Agent 9: AI Qualification ───────────────────────────────────────
function AIQualificationOutput({ data }: { data: any }) {
  const d = data?.data || data;
  const bant = d?.callScript?.qualificationQuestions || d?.callScript?.bant;
  return (
    <div className="space-y-4">
      {d?.voiceProvider && <Badge color="purple">{d.voiceProvider}</Badge>}
      {bant && (
        <>
          <SectionHeader icon={Phone} title="BANT Qualification Questions" />
          {Object.entries(bant).map(([key, val]: [string, any]) => (
            <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <Badge color="blue">{key.charAt(0).toUpperCase() + key.slice(1)}</Badge>
              <p className="mt-1.5 text-sm text-zinc-200">{typeof val === 'string' ? val : val.question}</p>
              {val.goodAnswers && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {val.goodAnswers.map((a: string, i: number) => <Badge key={i} color="emerald">{a}</Badge>)}
                </div>
              )}
            </div>
          ))}
        </>
      )}
      {d?.callResults && (
        <>
          <SectionHeader icon={Activity} title="Call Results" />
          {d.callResults.map((r: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div>
                <p className="text-sm text-zinc-200">{r.leadId}</p>
                <p className="text-xs text-zinc-500">{r.duration ? `${Math.floor(r.duration / 60)}m ${r.duration % 60}s` : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white">{r.score}/100</p>
                <Badge color={r.outcome?.includes('high') ? 'emerald' : r.outcome?.includes('medium') ? 'amber' : 'zinc'}>{r.outcome}</Badge>
              </div>
            </div>
          ))}
        </>
      )}
      {d?.qualificationThresholds && (
        <>
          <SectionHeader icon={Route} title="Routing Thresholds" />
          {Object.entries(d.qualificationThresholds).map(([key, val]: [string, any]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
              <p className="text-sm text-zinc-300">{key.replace(/_/g, ' ')}</p>
              <Badge color={val.minScore >= 80 ? 'emerald' : val.minScore >= 50 ? 'amber' : 'red'}>Score &ge; {val.minScore || val}</Badge>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Agent 10: Sales Routing ─────────────────────────────────────────
function SalesRoutingOutput({ data }: { data: any }) {
  const d = data?.data || data;
  const routeColor: Record<string, string> = { checkout: 'emerald', sales_call: 'blue', nurture: 'amber', disqualify: 'red' };
  const routeIcon: Record<string, string> = { checkout: '💰', sales_call: '📞', nurture: '📧', disqualify: '❌' };
  return (
    <div className="space-y-4">
      {d?.summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard icon={DollarSign} label="Checkout" value={`${d.summary.checkout || 0}`} color="text-emerald-400" />
          <MetricCard icon={Phone} label="Sales Call" value={`${d.summary.salesCall || 0}`} color="text-blue-400" />
          <MetricCard icon={Mail} label="Nurture" value={`${d.summary.nurture || 0}`} color="text-amber-400" />
          <MetricCard icon={XCircle} label="Disqualified" value={`${d.summary.disqualified || 0}`} color="text-red-400" />
        </div>
      )}
      {d?.routedLeads && (
        <>
          <SectionHeader icon={Route} title="Routed Leads" />
          {d.routedLeads.map((l: any, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <span className="text-xl">{routeIcon[l.route] || '➡️'}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-200">{l.leadId}</p>
                <p className="text-xs text-zinc-500">{l.reason}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{l.score}/100</p>
                <Badge color={routeColor[l.route] || 'zinc'}>{l.route?.replace('_', ' ')}</Badge>
              </div>
            </div>
          ))}
        </>
      )}
      {d?.routingEngine?.rules && !d?.routedLeads && (
        <>
          <SectionHeader icon={Route} title="Routing Rules" />
          {d.routingEngine.rules.map((r: any, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
              <span className="text-xl">{routeIcon[r.action] || '➡️'}</span>
              <div className="flex-1">
                <p className="text-sm text-zinc-200">{r.name}</p>
                <p className="text-xs text-zinc-500">{r.destination}</p>
              </div>
              <Badge color={routeColor[r.action] || 'zinc'}>{r.action?.replace('_', ' ')}</Badge>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Agent 11: Tracking & Attribution ────────────────────────────────
function TrackingOutput({ data }: { data: any }) {
  const d = data?.data || data;
  const ts = d?.trackingSetup;
  return (
    <div className="space-y-4">
      {d?.attributionModel && (
        <div className="rounded-lg border border-indigo-500/20 bg-indigo-950/10 p-3">
          <p className="text-xs text-indigo-400">Attribution Model</p>
          <p className="text-sm font-medium text-white">{d.attributionModel}</p>
          {d.attributionWindows && <p className="text-xs text-zinc-500">Click: {d.attributionWindows.clickThrough || d.attributionWindows.click} | View: {d.attributionWindows.viewThrough || d.attributionWindows.view}</p>}
        </div>
      )}
      {ts && (
        <>
          <SectionHeader icon={Activity} title="Tracking Infrastructure" />
          {ts.googleTagManager && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <Badge color="blue">Google Tag Manager</Badge>
              <p className="mt-1 text-xs text-zinc-400">Container: {ts.googleTagManager.containerId}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(ts.googleTagManager.triggers || []).map((t: string, i: number) => <Badge key={i} color="zinc">{t}</Badge>)}
              </div>
            </div>
          )}
          {ts.metaPixel && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <Badge color="purple">Meta Pixel</Badge>
              <div className="mt-2 flex flex-wrap gap-1">
                {(ts.metaPixel.standardEvents || ts.metaPixel.events || []).map((e: string, i: number) => <Badge key={i} color="purple">{e}</Badge>)}
              </div>
            </div>
          )}
          {ts.googleAdsConversion && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <Badge color="blue">Google Ads Conversion</Badge>
              <div className="mt-2 flex flex-wrap gap-1">
                {(ts.googleAdsConversion.conversionActions || ts.googleAds?.actions || []).map((a: any, i: number) => (
                  <Badge key={i} color="emerald">{typeof a === 'string' ? a : a.name}</Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Agent 12: Performance Optimization ──────────────────────────────
function PerformanceOutput({ data }: { data: any }) {
  const d = data?.data || data;
  const m = d?.currentMetrics || d?.metrics;
  const statusColor: Record<string, string> = { scale: 'emerald', optimize: 'amber', kill: 'red' };
  return (
    <div className="space-y-4">
      {m && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard icon={DollarSign} label="CPL" value={`$${m.cpl}`} color="text-amber-400" />
          <MetricCard icon={DollarSign} label="CAC" value={`$${m.cac}`} />
          <MetricCard icon={TrendingUp} label="ROAS" value={`${m.roas}x`} color="text-emerald-400" />
          <MetricCard icon={TrendingUp} label="LTV" value={`$${m.ltv?.toLocaleString()}`} color="text-blue-400" />
        </div>
      )}
      {d?.campaignAnalysis && (
        <>
          <SectionHeader icon={BarChart3} title="Campaign Analysis" />
          {d.campaignAnalysis.map((c: any, i: number) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-200">{c.campaign}</p>
                <Badge color={statusColor[c.status] || 'zinc'}>{c.status?.toUpperCase()}</Badge>
              </div>
              <p className="mt-1 text-sm text-zinc-300">{c.action}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{c.reason}</p>
              {c.metrics && (
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
                  <span>Spend: ${c.metrics.spend}</span>
                  <span>Leads: {c.metrics.leads}</span>
                  <span>CPL: ${c.metrics.cpl}</span>
                  <span>ROAS: {c.metrics.roas}x</span>
                </div>
              )}
            </div>
          ))}
        </>
      )}
      {d?.actions && !d?.campaignAnalysis && (
        <>
          <SectionHeader icon={Zap} title="Actions" />
          {d.actions.map((a: any, i: number) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
              <Badge color={statusColor[a.type] || 'zinc'}>{a.type?.toUpperCase()}</Badge>
              <p className="mt-1 text-sm text-zinc-200">{a.campaign} — {a.action}</p>
              <p className="text-xs text-zinc-500">{a.reason}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Agent 13: CRM Hygiene ───────────────────────────────────────────
function CRMHygieneOutput({ data }: { data: any }) {
  const d = data?.data || data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={Database} label="Records Cleaned" value={`${d?.deduplication?.totalRecords || d?.cleanedRecords || 0}`} color="text-emerald-400" />
        <MetricCard icon={XCircle} label="Duplicates Removed" value={`${d?.deduplication?.duplicatesRemoved || d?.duplicatesRemoved || 0}`} color="text-red-400" />
        <MetricCard icon={TrendingUp} label="Enrichment Rate" value={`${d?.enrichment?.enrichmentRate || 0}%`} color="text-blue-400" />
        <MetricCard icon={Shield} label="Data Quality" value={`${d?.dataQualityScore || 0}%`} color="text-emerald-400" />
      </div>
      {d?.validation && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-xs text-zinc-400">Validation</p>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-zinc-300">
            <span>Invalid emails: {d.validation.invalidEmails}</span>
            <span>Invalid phones: {d.validation.invalidPhones}</span>
            <span>Missing fields: {d.validation.missingRequiredFields}</span>
          </div>
        </div>
      )}
      {d?.lifecycleUpdates && (
        <>
          <SectionHeader icon={ArrowRight} title="Lifecycle Updates" />
          {(d.lifecycleUpdates || d?.stageUpdates || []).map((u: any, i: number) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5 text-sm">
              <Badge color="zinc">{u.leadId}</Badge>
              <Badge color="amber">{u.from}</Badge>
              <ArrowRight className="h-3 w-3 text-zinc-600" />
              <Badge color="emerald">{u.to}</Badge>
              <span className="text-xs text-zinc-500">{u.reason}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Main Router ─────────────────────────────────────────────────────
const renderers: Record<string, (props: { data: any }) => React.ReactElement> = {
  'service-research': ServiceResearchOutput,
  'offer-engineering': OfferEngineeringOutput,
  'validation': ValidationOutput,
  'funnel-builder': FunnelBuilderOutput,
  'content-creative': ContentCreativeOutput,
  'paid-traffic': PaidTrafficOutput,
  'outbound-outreach': OutboundOutreachOutput,
  'inbound-capture': InboundCaptureOutput,
  'ai-qualification': AIQualificationOutput,
  'sales-routing': SalesRoutingOutput,
  'tracking-attribution': TrackingOutput,
  'performance-optimization': PerformanceOutput,
  'crm-hygiene': CRMHygieneOutput,
};

export function AgentOutputRenderer({ agentId, data }: AgentOutputRendererProps) {
  if (!data) return <p className="text-sm text-zinc-500">No output data</p>;

  const Renderer = renderers[agentId];
  if (Renderer) {
    return <Renderer data={data} />;
  }

  // Fallback: formatted JSON
  return (
    <pre className="max-h-96 overflow-auto rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-xs text-zinc-300">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
