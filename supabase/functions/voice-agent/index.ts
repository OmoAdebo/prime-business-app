import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const SYSTEM = `You are Prime, the in-app AI assistant for Prime Business Suite — a Nigerian SMB platform (currency: Naira ₦).
You help business owners run their dashboard by reasoning about what they want and CALLING TOOLS to act.

Rules:
- Be concise and warm. Reply in 1-2 short sentences.
- When the user wants to perform an action (create invoice/bill, add product/medication/SKU, record expense, transfer money, add customer/patient/client, log a stock movement, journal entry, payroll, order, or supplier), call the corresponding tool with whatever fields the user provided. Leave unknown fields blank — the UI form will collect the rest.
- For pure navigation requests (e.g. "open reports"), call the navigate tool.
- If the user asks a general question, answer briefly without calling tools.
- Always speak as if the action is happening now ("Opening invoice form..." / "Got it, navigating to reports...").
- Never invent data values the user did not say.
- Map industry-specific terminology to the right tool: "patient" → customer, "medication"/"drug" → product, "buyer" → customer, "SKU" → product, "client" → customer, "bill" → invoice.`;

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
      description: 'Open the Create Invoice / Bill dialog, optionally prefilled.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string' },
          amount: { type: 'number', description: 'Total amount in Naira' },
          description: { type: 'string' },
          due_date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
          quantity: { type: 'number' },
          product_name: { type: 'string' },
          unit_price: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_add_product',
      description: 'Open the Add Product / Medication / SKU dialog.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
          sku: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
          category: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_record_expense',
      description: 'Open the record-expense dialog.',
      parameters: { type: 'object', properties: { amount: { type: 'number' }, description: { type: 'string' }, category: { type: 'string' }, date: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_add_customer',
      description: 'Open the Add Customer / Patient / Client dialog.',
      parameters: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_new_transfer',
      description: 'Open the new bank transfer dialog.',
      parameters: { type: 'object', properties: { amount: { type: 'number' }, recipient: { type: 'string' }, account_number: { type: 'string' }, bank: { type: 'string' }, note: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_add_supplier',
      description: 'Open the Add Supplier / Vendor dialog.',
      parameters: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_stock_movement',
      description: 'Open the stock movement dialog (stock in, stock out, adjustment).',
      parameters: { type: 'object', properties: { product_name: { type: 'string' }, quantity: { type: 'number' }, movement_type: { type: 'string', enum: ['in', 'out', 'adjust'] }, note: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_journal_entry',
      description: 'Open the journal entry dialog.',
      parameters: { type: 'object', properties: { description: { type: 'string' }, amount: { type: 'number' }, debit_account: { type: 'string' }, credit_account: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_payroll_run',
      description: 'Open the payroll dialog to start a payroll run or record a salary.',
      parameters: { type: 'object', properties: { period: { type: 'string' }, employee_name: { type: 'string' }, amount: { type: 'number' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_create_order',
      description: 'Open the create order dialog for a sales order.',
      parameters: { type: 'object', properties: { customer_name: { type: 'string' }, product_name: { type: 'string' }, quantity: { type: 'number' }, total: { type: 'number' } } },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { messages, page, industry } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const ctx =
      (page ? `\n\nCurrent page: ${page}` : '') +
      (industry?.category
        ? `\n\nBusiness category: ${industry.category}${industry.subcategory ? ` / ${industry.subcategory}` : ''}. Use this industry's terminology when speaking back to the user.`
        : '');

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
