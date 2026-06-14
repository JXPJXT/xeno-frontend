import { executeTool } from './tools';

/* ─── Types ─── */
export interface AgentStep {
  type: 'tool_call' | 'tool_result' | 'thinking';
  tool?: string;
  args?: Record<string, any>;
  result?: any;
  success?: boolean;
  text?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps?: AgentStep[];
  timestamp: Date;
}

/* ─── System Prompt ─── */
const SYSTEM_PROMPT = `You are a retail marketing AI agent for StyleHub India, a fashion brand. You help the marketing team reach their shoppers intelligently.

You have access to live customer data, campaign tools, and can execute campaigns end-to-end. When a marketer gives you a goal, you:

1. THINK: Analyze what they want to achieve
2. INVESTIGATE: Call tools to understand the current data (segments, customers, past campaigns)
3. STRATEGIZE: Decide on the best audience, channel, offer, and message
4. ACT: Create and launch the campaign
5. REPORT: Share what you did and what to watch for

Always:
- State your reasoning before taking action ("I can see 14 high-churn-risk customers — email historically performs best for this segment...")
- Be specific with numbers ("targeting 14 customers" not "some customers")
- After launching, tell the marketer what metrics to watch and approximately when results will arrive
- If something fails, explain why and suggest an alternative
- Format responses with markdown: use **bold** for key numbers, bullet lists for summaries

You can also just answer questions about performance, explain what segments mean, or analyze results — you don't always need to run a campaign.

Available segments in the system: HighChurnRisk, DormantCustomers, HighValueActive, FirstTimeBuyers, FrequentBuyers, PremiumFashionistas, BargainHunters, ActiveEngaged, NewCustomers.

WORKFLOW RULES — follow these in exact sequence for campaign creation:

STEP 1 — ANALYZE: Call get_ai_strategy and/or get_customer_segments to understand the audience.

STEP 2 — CHANNEL SELECTION: Output a channel_selection JSON block (wrapped in triple backticks labeled "channel_selection") showing all 4 channels with pros/cons, your recommendation marked, and estimated engagement rates based on segment behavior. Then say: "Which channel would you like to use? I'll draft personalized content for it." Wait for user to pick.

Format:
\`\`\`channel_selection
{"audience":"SegmentName","audienceSize":14,"channels":[{"id":"EMAIL","name":"Email","icon":"📧","recommended":true,"reason":"...","bestFor":"Rich content, discount codes","constraint":"No character limit","estimatedOpenRate":"60-70%"},{"id":"WHATSAPP","name":"WhatsApp","icon":"💬","recommended":false,"reason":"...","bestFor":"Conversational, urgent","constraint":"Keep under 300 chars","estimatedOpenRate":"85-90%"},{"id":"SMS","name":"SMS","icon":"📱","recommended":false,"reason":"...","bestFor":"Simple discount codes","constraint":"Under 160 characters","estimatedOpenRate":"95% open, 5% click"},{"id":"PUSH","name":"Push Notification","icon":"🔔","recommended":false,"reason":"...","bestFor":"Flash sales, time-sensitive","constraint":"Title: 50 chars, Body: 100 chars","estimatedOpenRate":"20-40%"}],"aiRecommendation":"EMAIL","recommendationReason":"..."}
\`\`\`

STEP 3 — CONTENT DRAFT: After user picks channel, output a content_draft JSON block with personalized message copy written specifically for the chosen channel's constraints, the audience segment's persona, and the appropriate offer. Include personalization variables like {{firstName}}.

Format:
\`\`\`content_draft
{"channel":"EMAIL","subject":"...","body":"...","preview":"First 80 chars of body...","personalizationVars":["{{firstName}}"],"characterCount":312,"channelConstraint":"No limit","withinLimit":true,"offerCode":"COMEBACK15","offerType":"PERCENTAGE","offerValue":"15% off"}
\`\`\`

After showing, say: "Want me to adjust the tone, offer, or message? Or shall I proceed with this?"
Wait for user to approve or request changes.

STEP 4 — CONFIRM & LAUNCH: After content approval, call create_campaign, then present confirmation summary and wait for final "yes" before calling launch_campaign. Use this format:

"I'm ready to launch. Here's the plan:

📋 **Campaign:** [campaign name]
👥 **Audience:** [segment name] — [N] customers
📱 **Channel:** [CHANNEL]
💬 **Message preview:** "[first 80 chars of message]..."
🎁 **Offer:** [offer description or 'No promotional offer']
📊 **Expected reach:** [N] messages

**Shall I launch this campaign?** Tap Launch below or say 'yes' to confirm."

Wait for user confirmation before calling launch_campaign.

NEVER skip steps. NEVER call create_campaign before content is approved. NEVER call launch_campaign without explicit user confirmation.

CHANNEL FORMAT RULES:
- EMAIL: Rich content OK, no char limit, include subject line, use markdown formatting
- WHATSAPP: Max 300 chars, conversational tone, 1-2 emojis, no subject
- SMS: Max 160 chars, include offer code, no emojis, plain text only
- PUSH: Title max 50 chars, body max 100 chars, action-oriented, urgent tone

METRICS FORMAT RULE:
When reporting campaign results from get_campaign_results, include a campaign_metrics JSON block BEFORE your analysis text:

\`\`\`campaign_metrics
{"campaignName":"...","status":"...","sent":0,"delivered":0,"opened":0,"clicked":0,"converted":0,"openRate":0,"clickRate":0,"conversionRate":0,"revenue":0}
\`\`\`

Then follow with your written analysis after the JSON block.

DUPLICATE PREVENTION:
If you have already called create_campaign in this conversation and received a campaign ID, NEVER call create_campaign again. Go directly to launch_campaign with the existing campaign ID.

HONESTY RULE:
Never promise to proactively monitor, notify, or follow up. You cannot take action unless the user messages you. Instead of "I'll notify you with results," say: "Ask me for results anytime — just say 'show me results' and I'll pull the latest numbers. Delivery callbacks typically arrive within a few seconds to minutes."

ZERO-METRICS RULE:
When campaign metrics show 0 delivered despite messages being sent, explain clearly: "The delivery receipts haven't arrived yet — our channel service processes callbacks asynchronously, typically within a few seconds to minutes. Try asking for results again in a moment." Do NOT speculate about deliverability problems unless delivered > 0 but opened = 0.

Current date: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
Brand: StyleHub India | Currency: INR (₹)`;

/* ─── Tool Definitions ─── */
const AGENT_TOOLS: any[] = [
  {
    type: 'function',
    function: {
      name: 'get_platform_overview',
      description: 'Get overall platform KPIs: total customers, active campaigns, revenue generated, attributed revenue, marketing funnel stats (sent/delivered/opened/clicked counts)',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customer_segments',
      description: 'List all customer segments with names and customer counts. Use to understand available audience pools.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customers',
      description: 'Search and list customers. Returns profiles with name, email, lifecycle stage, spend.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Optional search term for name or email' },
          limit: { type: 'number', description: 'Max results, default 20' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customer_intelligence',
      description: 'Get deep intelligence for a specific customer: RFM scores, churn risk, CLV, persona, product affinities.',
      parameters: {
        type: 'object',
        properties: {
          customerId: { type: 'string', description: 'The customer UUID' },
        },
        required: ['customerId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_campaigns',
      description: 'List all campaigns with status (DRAFT/ACTIVE/COMPLETED), channel, segment, and reach count.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_campaign_results',
      description: 'Get detailed analytics for a specific campaign: open rate, click rate, conversion rate, revenue, funnel breakdown.',
      parameters: {
        type: 'object',
        properties: {
          campaignId: { type: 'string', description: 'The campaign UUID' },
        },
        required: ['campaignId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_campaign',
      description: 'Create a new campaign. Returns campaign ID. Use after get_ai_strategy. You can pass the messageTemplate object directly from get_ai_strategy output, or pass subject and messageBody separately.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Campaign name' },
          segmentId: { type: 'string', description: 'Target segment UUID. Get this from get_ai_strategy response: audience.segmentId' },
          segmentName: { type: 'string', description: 'Target segment name if segmentId is not available' },
          channel: { type: 'string', enum: ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH'], description: 'Delivery channel' },
          subject: { type: 'string', description: 'Message subject line. Required for EMAIL, optional/unused for other channels.' },
          messageBody: { type: 'string', description: 'Message body/content.' },
          messageTemplate: {
            description: 'Message content. Can be a string (the body) or an object containing "subject" and "body" properties (matching get_ai_strategy output).',
            anyOf: [
              { type: 'string' },
              {
                type: 'object',
                properties: {
                  subject: { type: 'string' },
                  body: { type: 'string' }
                }
              }
            ]
          }
        },
        required: ['name', 'channel'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'launch_campaign',
      description: 'Launch a created campaign. Dispatches messages to all segment customers via channel service. Only call after create_campaign.',
      parameters: {
        type: 'object',
        properties: {
          campaignId: { type: 'string', description: 'Campaign UUID from create_campaign' },
        },
        required: ['campaignId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ai_strategy',
      description: 'Use built-in AI decisioning engine to recommend a strategy for a business goal. Returns audience (with segmentId UUID, segmentName, estimatedSize), channel, offer, message template, and reasoning explanations. ALWAYS call this before create_campaign to get the segmentId.',
      parameters: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'Business goal in plain English' },
        },
        required: ['goal'],
      },
    },
  },
];

/* ─── Fetch Chat Completion (OpenAI API Compatible) ─── */
interface CompletionParams {
  model: string;
  messages: any[];
  tools?: any[];
  tool_choice?: string;
  temperature?: number;
  max_tokens?: number;
}

async function fetchChatCompletion(
  provider: 'gemini' | 'nvidia' | 'groq',
  apiKey: string,
  params: CompletionParams,
  signal?: AbortSignal,
): Promise<any> {
  let url = '';
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  if (provider === 'gemini') {
    url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  } else if (provider === 'nvidia') {
    url = 'https://integrate.api.nvidia.com/v1/chat/completions';
  } else {
    url = 'https://api.groq.com/openai/v1/chat/completions';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
    signal,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || `API error ${res.status}`);
  }
  return json;
}

/* ─── Rate Limit Retry Helper ─── */
async function createChatCompletionWithRetry(
  provider: 'gemini' | 'nvidia' | 'groq',
  apiKey: string,
  params: CompletionParams,
  onStep: (step: AgentStep) => void,
  retries = 5,
  delay = 6000,
  signal?: AbortSignal,
): Promise<any> {
  try {
    return await fetchChatCompletion(provider, apiKey, params, signal);
  } catch (error: any) {
    if (signal?.aborted) {
      throw new Error('Agent execution cancelled by user');
    }
    const isRateLimit = 
      error.status === 429 || 
      error.code === 'rate_limit_exceeded' || 
      error.message?.includes('rate_limit') ||
      error.message?.includes('Rate limit') ||
      error.message?.includes('429');

    if (isRateLimit && retries > 0) {
      let waitMs = delay;
      let displayMessage = 'Rate limit reached. Retrying shortly...';
      
      // Try to parse wait time from error message, e.g., "Please try again in 4.88s."
      const match = error.message?.match(/try again in (\d+(\.\d+)?)s/i);
      if (match) {
        const seconds = parseFloat(match[1]);
        if (!isNaN(seconds)) {
          waitMs = Math.ceil(seconds * 1000) + 700; // Add 700ms safety buffer
          displayMessage = `Rate limit reached. Retrying in ${seconds.toFixed(1)}s...`;
        }
      } else {
        const retryAfterHeader = error.headers?.get?.('retry-after') || error.response?.headers?.get?.('retry-after');
        if (retryAfterHeader) {
          const seconds = parseFloat(retryAfterHeader);
          if (!isNaN(seconds)) {
            waitMs = Math.ceil(seconds * 1000) + 700;
            displayMessage = `Rate limit reached. Retrying in ${seconds.toFixed(1)}s...`;
          }
        }
      }

      onStep({
        type: 'thinking',
        text: displayMessage
      });

      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timeoutId);
          reject(new Error('Agent execution cancelled by user'));
        };
        if (signal) signal.addEventListener('abort', onAbort);
        const timeoutId = setTimeout(() => {
          if (signal) signal.removeEventListener('abort', onAbort);
          resolve();
        }, waitMs);
      });
      return createChatCompletionWithRetry(provider, apiKey, params, onStep, retries - 1, delay * 2, signal);
    }
    throw error;
  }
}

/* ─── Agent Loop ─── */
export async function runAgentLoop(
  userMessage: string,
  history: Array<{ role: string; content: string | null; tool_calls?: any; tool_call_id?: string }>,
  onStep: (step: AgentStep) => void,
  authToken: string,
  tenantId: string,
  signal?: AbortSignal,
): Promise<string> {
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const nvidiaApiKey = import.meta.env.VITE_NVIDIA_API_KEY;
  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!geminiApiKey && !nvidiaApiKey && (!groqApiKey || groqApiKey === 'your_groq_key_here')) {
    return 'Please configure your AI model credentials. Set `VITE_GEMINI_API_KEY`, `VITE_NVIDIA_API_KEY`, or `VITE_GROQ_API_KEY` in `frontend/.env`. Get free endpoints at Google AI Studio or Nvidia NIM.';
  }

  // Detect provider & config
  let provider: 'gemini' | 'nvidia' | 'groq' = 'groq';
  let apiKey = '';
  let model = '';

  if (geminiApiKey) {
    provider = 'gemini';
    apiKey = geminiApiKey;
    model = 'gemini-2.5-flash';
  } else if (nvidiaApiKey) {
    provider = 'nvidia';
    apiKey = nvidiaApiKey;
    model = 'meta/llama-3.3-70b-instruct';
  } else {
    provider = 'groq';
    apiKey = groqApiKey || '';
    model = 'llama-3.1-8b-instant';
  }

  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage },
  ];

  let iterations = 0;
  const MAX = 10;

  // Gemini free tier: ~15 RPM. Throttle between iterations to stay under limit.
  const THROTTLE_MS = provider === 'gemini' ? 4000 : 500;

  while (iterations < MAX) {
    iterations++;

    if (signal?.aborted) {
      throw new Error('Agent execution cancelled by user');
    }

    // Throttle: wait between LLM calls (skip first call)
    if (iterations > 1) {
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timeoutId);
          reject(new Error('Agent execution cancelled by user'));
        };
        if (signal) signal.addEventListener('abort', onAbort);
        const timeoutId = setTimeout(() => {
          if (signal) signal.removeEventListener('abort', onAbort);
          resolve();
        }, THROTTLE_MS);
      });
    }

    if (signal?.aborted) {
      throw new Error('Agent execution cancelled by user');
    }

    const response = await createChatCompletionWithRetry(
      provider,
      apiKey,
      {
        model,
        messages,
        tools: AGENT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 2000,
      },
      onStep,
      5,
      6000,
      signal,
    );

    if (signal?.aborted) {
      throw new Error('Agent execution cancelled by user');
    }

    const choice = response.choices[0];
    const msg = choice.message;

    messages.push({
      role: 'assistant',
      content: msg.content,
      tool_calls: msg.tool_calls,
    });

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content || '';
    }

    for (const tc of msg.tool_calls) {
      if (signal?.aborted) {
        throw new Error('Agent execution cancelled by user');
      }

      const toolName = tc.function.name;
      let toolArgs: Record<string, any> = {};
      try {
        toolArgs = JSON.parse(tc.function.arguments || '{}');
      } catch {
        toolArgs = {};
      }

      onStep({ type: 'tool_call', tool: toolName, args: toolArgs });

      let result: any;
      try {
        result = await executeTool(toolName, toolArgs, authToken, tenantId, signal);
        onStep({ type: 'tool_result', tool: toolName, result, success: true });
      } catch (err: any) {
        if (signal?.aborted) {
          throw new Error('Agent execution cancelled by user');
        }
        result = { error: err.message };
        onStep({ type: 'tool_result', tool: toolName, result, success: false });
      }

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  return "I've reached the maximum number of reasoning steps. Here's where things stand based on what I've gathered so far.";
}
