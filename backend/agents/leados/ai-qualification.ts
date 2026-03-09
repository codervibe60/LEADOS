import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { mockBlandAI } from '../../integrations/mock-data';

const SYSTEM_PROMPT = `You are the AI Qualification Agent for LeadOS. You conduct AI-powered voice calls to qualify inbound leads using the BANT framework (Budget, Authority, Need, Timeline).

Your responsibilities:
1. CALL SCRIPTING: Generate dynamic, conversational call scripts that feel natural — not robotic
2. BANT SCORING: Score each lead on a 0-100 scale based on their answers to qualification questions
3. OBJECTION HANDLING: Respond to common objections with empathetic, value-driven rebuttals
4. THRESHOLD ROUTING: Classify leads into high_intent_budget (>=80), high_intent_complex (>=70), medium_intent (>=50), or low_intent (<50)
5. TRANSCRIPT ANALYSIS: Extract key signals, buying intent, and objections from call transcripts

Accept JSON input with lead data, call configuration, and previous pipeline outputs.
Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "voiceProvider": "string",
  "callScript": {
    "greeting": "string",
    "qualificationQuestions": {
      "budget": { "question": "string", "goodAnswers": ["string"], "scoring": {} },
      "authority": { "question": "string", "goodAnswers": ["string"], "scoring": {} },
      "need": { "question": "string", "goodAnswers": ["string"], "scoring": {} },
      "timeline": { "question": "string", "goodAnswers": ["string"], "scoring": {} }
    },
    "objectionHandling": {},
    "closing": "string"
  },
  "qualificationThresholds": {},
  "callResults": [],
  "reasoning": "string",
  "confidence": "number 0-100"
}

Keep conversations under 5 minutes. Be warm, consultative, and never pushy. The goal is to qualify — not to sell on the call.`;

export class AIQualificationAgent extends BaseAgent {
  constructor() {
    super(
      'ai-qualification',
      'AI Qualification Agent',
      'Conducts AI voice calls to qualify leads using BANT framework, scores responses, and handles objections'
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
    // Simulate an AI voice call via Bland AI
    const callResult = await mockBlandAI.makeCall({
      phone: '+1-555-0101',
      leadId: 'lead_1',
      script: 'qualification_bant',
    });
    await this.log('bland_ai_call_completed', {
      callId: callResult.callId,
      duration: callResult.duration,
      score: callResult.score,
    });

    // Simulate a second call with lower engagement
    const callResult2 = await mockBlandAI.makeCall({
      phone: '+1-555-0104',
      leadId: 'lead_2',
      script: 'qualification_bant',
    });
    await this.log('bland_ai_call_completed', {
      callId: callResult2.callId,
      duration: callResult2.duration,
      score: callResult2.score,
    });

    return {
      voiceProvider: 'Bland AI',
      callScript: {
        greeting:
          'Hi, this is Alex from LeadOS. Thanks for your interest in our growth services — I have just a few quick questions to see if we can help. Do you have a couple of minutes?',
        qualificationQuestions: {
          budget: {
            question: "What's your current monthly marketing budget?",
            goodAnswers: ['$2,000-$5,000/month', '$5,000+'],
            scoring: {
              '$5000+': 30,
              '$2000-5000': 25,
              '$1000-2000': 15,
              '<$1000': 5,
            },
          },
          authority: {
            question: 'Are you the decision maker for marketing investments?',
            goodAnswers: ['Yes', "I'm the CMO/VP"],
            scoring: {
              Yes: 25,
              'Part of team': 15,
              No: 5,
            },
          },
          need: {
            question: "What's your biggest challenge with lead generation?",
            goodAnswers: ['Getting consistent leads', 'High CAC'],
            scoring: {
              'Clear pain': 25,
              'Some pain': 15,
              'Just browsing': 5,
            },
          },
          timeline: {
            question: 'When are you looking to implement a solution?',
            goodAnswers: ['This month', 'Within 30 days'],
            scoring: {
              Immediately: 20,
              '30 days': 15,
              '90 days': 10,
              'No rush': 5,
            },
          },
        },
        objectionHandling: {
          'too expensive':
            'I understand budget is important. Our clients typically see 2-5x ROI within 90 days. Would it help to see a breakdown of expected returns for a company your size?',
          'need to think':
            'Absolutely, take your time. Would it help if I sent you a case study showing how a similar company in your industry got results? No pressure at all.',
          'already have solution':
            "That's great that you're already investing in lead gen. What results are you currently seeing? We often help teams improve by 2-3x on their existing numbers.",
          'not the right time':
            'Totally understand. When would be a better time to revisit this? I can set a reminder and follow up when it makes more sense for your team.',
          'send me more info':
            "Happy to! I'll send over a quick overview and a relevant case study. What's the best email for that? And just so I send the right info — what's your main goal with lead generation right now?",
        },
        closing:
          "Based on what you've shared, it sounds like we could be a really strong fit. I'd love to set up a quick 20-minute strategy session where we map out a custom plan for your business. Would Tuesday or Thursday work better this week?",
      },
      qualificationThresholds: {
        high_intent_budget: {
          minScore: 80,
          action: 'Route to checkout',
          description: 'Budget confirmed, decision maker, clear need, urgent timeline',
        },
        high_intent_complex: {
          minScore: 70,
          action: 'Book sales call',
          description: 'High intent but enterprise/complex needs requiring human touch',
        },
        medium_intent: {
          minScore: 50,
          action: 'Enter nurture sequence',
          description: 'Some interest but not ready to buy — needs education',
        },
        low_intent: {
          minScore: 0,
          action: 'Disqualify',
          description: 'No budget, no authority, no need, or no timeline',
        },
      },
      callResults: [
        {
          leadId: 'lead_1',
          callId: callResult.callId,
          score: 82,
          outcome: 'high_intent_budget',
          duration: 272,
          bantBreakdown: { budget: 30, authority: 25, need: 20, timeline: 7 },
          transcript:
            'Agent: Hi, this is Alex from LeadOS. Thanks for your interest...\nProspect: Yes, I filled out the form yesterday. We need help with lead gen.\nAgent: What\'s your current monthly marketing budget?\nProspect: We spend about $5,000 per month on marketing.\nAgent: Are you the decision maker for marketing investments?\nProspect: Yes, I\'m the VP of Marketing.\nAgent: What\'s your biggest challenge right now?\nProspect: Inconsistent lead flow — some months are great, others are terrible.\nAgent: When are you looking to get started?\nProspect: We\'d like to start within the next 2-3 weeks.\nAgent: Great — based on what you\'ve shared, I think we\'re a strong fit...',
          keySignals: ['$5k budget confirmed', 'VP-level decision maker', 'Clear pain point', '2-3 week timeline'],
        },
        {
          leadId: 'lead_2',
          callId: callResult2.callId,
          score: 65,
          outcome: 'medium_intent',
          duration: 180,
          bantBreakdown: { budget: 15, authority: 25, need: 15, timeline: 10 },
          transcript:
            'Agent: Hi, this is Alex from LeadOS...\nProspect: Hi, yeah I was just looking around.\nAgent: What\'s your current marketing budget?\nProspect: We spend about $1,500 a month.\nAgent: Are you the decision maker?\nProspect: Yes, I run the company.\nAgent: What challenges are you facing?\nProspect: We could use more leads but things are okay.\nAgent: When would you want to start?\nProspect: Maybe in the next couple months.',
          keySignals: ['Lower budget ($1.5k)', 'Owner/decision maker', 'Mild pain', '60-90 day timeline'],
        },
      ],
      totalCallsMade: 2,
      avgCallDuration: 226,
      avgScore: 73.5,
      reasoning:
        'Conducted 2 AI qualification calls via Bland AI. Lead 1 scored 82 (high intent — budget confirmed at $5k, VP decision maker, clear pain, 2-3 week timeline). Lead 2 scored 65 (medium intent — lower budget, mild need, no urgency). BANT scoring weighted Budget highest (30 pts) as strongest conversion predictor.',
      confidence: 86,
    };
  }
}
