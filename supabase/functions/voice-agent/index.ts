import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const SYSTEM = `You are Prime, the in-app AI assistant for Prime Business Suite — a Nigerian SMB platform (currency: Naira ₦).
You help business owners run their dashboard by reasoning about what they want and CALLING TOOLS to act.

Rules:
- Be concise and warm. Reply in 1-2 short sentences.
- When the user wants to perform an action (create invoice, add product, record expense, transfer money, add customer), call the corresponding tool with whatever fields the user provided. Leave unknown fields blank — the UI form will collect the rest.
- For pure navigation requests (e.g. "open reports"), call the navigate tool.
- If the user asks a general question, answer briefly without calling tools.
- Always speak as if the action is happening now ("Opening invoice form..." / "Got it, navigating to reports...").
- Never invent data values the user did not say.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'navigate',
      description: 'Navigate to a page in the app',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'App route, e.g. /dashboard, /reports, /banking, /inventory/products, /payroll, /pos, /store, /customers, /settings, /budgeting, /help' },
          label: { type: 'string', description: 'Human readable destination name' },
        },
        required: ['path', 'label'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_create_invoice',
      description: 'Open the Create Invoice dialog on the Invoicing page, optionally prefilled.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string' },
          amount: { type: 'number', description: 'Total amount in Naira' },
          description: { type: 'string' },
          due_date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_add_product',
      description: 'Open the Add Product dialog on the Products page.',
      parameters: { type: 'object', properties: { name: { type: 'string' }, price: { type: 'number' }, sku: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_record_expense',
      description: 'Open the record-expense dialog.',
      parameters: { type: 'object', properties: { amount: { type: 'number' }, description: { type: 'string' }, category: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_add_customer',
      description: 'Open the Add Customer dialog.',
      parameters: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_new_transfer',
      description: 'Open the new bank transfer dialog.',
      parameters: { type: 'object', properties: { amount: { type: 'number' }, recipient: { type: 'string' } } },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { messages, page } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const ctx = page ? `\n\nCurrent page: ${page}` : '';
    const payload = {
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'system', content: SYSTEM + ctx }, ...messages],
      tools: TOOLS,
      tool_choice: 'auto',
    };

    const r = await fetch(GATEWAY, {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (r.status === 429) return new Response(JSON.stringify({ error: 'rate_limit', message: 'Too many requests. Try again in a moment.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (r.status === 402) return new Response(JSON.stringify({ error: 'payment_required', message: 'AI credits exhausted. Please top up.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!r.ok) return new Response(JSON.stringify({ error: 'gateway_error', detail: await r.text() }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const data = await r.json();
    const msg = data.choices?.[0]?.message ?? {};
    const reply: string = msg.content ?? '';
    const toolCalls = (msg.tool_calls ?? []).map((tc: any) => {
      let args: any = {};
      try { args = JSON.parse(tc.function?.arguments ?? '{}'); } catch {}
      return { name: tc.function?.name, args };
    });

    return new Response(JSON.stringify({ reply, tool_calls: toolCalls }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'internal', message: String((e as Error).message) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
