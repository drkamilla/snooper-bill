export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export interface AiAgentResult {
  thoughtProcess: string[];
  humanExplanation: string;
  status: 'VERIFIED' | 'ERRORS_FOUND';
}

const AI_ENDPOINT = '/api/vireonix/v1/chat/completions';

export async function parseTableWithAi(rawRows: any[][]): Promise<any[]> {
  if (!rawRows || rawRows.length < 2) return [];

  const dataRows = rawRows.filter((row) => row && row.some((cell) => String(cell).trim() !== ''));
  if (dataRows.length < 2) return [];

  const prompt = `You are an institutional financial parser for Arc Network payment batches.
Analyze this raw spreadsheet extract (array of rows):
${JSON.stringify(dataRows)}

Extract all counterparty payment rows across multinational billing formats.
Rules:
- Identify recipient name, EVM wallet address (0x...), numeric amount, currency token (EURC if euro, else USDC), and invoice memo reference.
- Skip pure table header rows.
- Return a strict JSON array of objects without markdown formatting:
[
  {
    "row": 1,
    "name": "Acme Corp",
    "address": "0x123...",
    "amount": 500,
    "token": "USDC",
    "memo": "INV-1"
  }
]`;

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'auto',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const rawContent = data.choices?.[0]?.message?.content || '';
      const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedArray = JSON.parse(cleanJson);
      const items = Array.isArray(parsedArray) ? parsedArray : parsedArray.records || [];

      if (items.length > 0) {
        return items.map((item: any, idx: number) => ({
          rowNumber: item.row || idx + 1,
          recipientName: String(item.name || `Recipient #${idx + 1}`).trim(),
          walletAddress: String(item.address || '').trim(),
          amount: typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount || '0').replace(',', '.')),
          token: /eur/i.test(String(item.token || '')) ? 'EURC' : 'USDC',
          invoiceRef: String(item.memo || `INV-${idx + 1}`).trim(),
          rawDescription: `${item.name || ''} ${item.memo || ''}`,
        }));
      }
    }
  } catch (err) {}

  const contentRows = dataRows.slice(1);
  return contentRows.map((row, idx) => {
    let address = '';
    let amount = 0;
    let name = '';
    let token = 'USDC';
    let memo = `INV-${idx + 1}`;

    for (const cell of row) {
      const s = String(cell).trim();
      if (!address && ((s.startsWith('0x') && s.length >= 40) || (s.startsWith('T') && s.length >= 33))) {
        address = s;
        continue;
      }
      const numMatch = s.match(/^-?\d+([.,]\d+)?/);
      if (!amount && numMatch && !s.startsWith('0x')) {
        const parsed = parseFloat(numMatch[0].replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) {
          amount = parsed;
          if (/eur|euro|€/i.test(s)) token = 'EURC';
          continue;
        }
      }
      if (/eur|euro|€/i.test(s)) {
        token = 'EURC';
      }
      if (!name && s.length > 1 && isNaN(Number(s)) && !s.startsWith('0x')) {
        name = s;
        continue;
      }
      if (!memo && s.length > 0 && isNaN(Number(s))) {
        memo = s;
      }
    }

    return {
      rowNumber: idx + 1,
      recipientName: name || `Recipient #${idx + 1}`,
      walletAddress: address,
      amount: amount,
      token: token,
      invoiceRef: memo,
      rawDescription: row.join(' '),
    };
  });
}

export async function runArcAgentAudit(
  recordsCount: number,
  recordsSummary: any[]
): Promise<AiAgentResult> {
  const hasErrors = recordsSummary.some((r) => r.errors && r.errors.length > 0);

  const systemPrompt = `You are Snooper Bill, an AI billing and payroll compliance auditor on Arc Mainnet (Chain ID 5042, native USDC gas, sub-second finality).
Audit the payment manifest.
Rules:
1. Provide a concise 2-sentence executive summary.
2. Do not list rows individually.
3. State the count of flagged entries, the primary discrepancy category, and that treasury execution is locked until resolved.
4. Output strict JSON without markdown:
{
  "thoughtProcess": ["Address format verified", "Gas parameters checked"],
  "humanExplanation": "Executive summary text here"
}`;

  const userPrompt = `Audit manifest with ${recordsCount} records. Identified issues: ${JSON.stringify(recordsSummary.filter(r => r.errors && r.errors.length > 0))}`;

  try {
    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'auto',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      thoughtProcess: parsed.thoughtProcess || ['Structure audit complete'],
      humanExplanation: parsed.humanExplanation || rawContent,
      status: hasErrors ? 'ERRORS_FOUND' : 'VERIFIED',
    };
  } catch (error) {
    return fallbackLocalAudit(recordsCount, recordsSummary);
  }
}

export async function sendChatMessageToAi(
  userQuestion: string,
  chatHistory: ChatMessage[],
  records: any[]
): Promise<string> {
  const systemPrompt = `You are Snooper Bill Assistant on Arc Mainnet. Provide concise, professional guidance regarding Arc Network batch payments, native USDC gas, and settlements.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-4).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    })),
    { role: 'user', content: userQuestion },
  ];

  try {
    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'auto',
        messages,
        temperature: 0.5,
      }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Response received.';
  } catch (error) {
    return 'Unable to reach the settlement agent service.';
  }
}

function fallbackLocalAudit(recordsCount: number, records: any[]): AiAgentResult {
  const errorItems = records.filter((r) => r.errors && r.errors.length > 0);
  if (errorItems.length === 0) {
    return {
      thoughtProcess: ['All Arc EVM addresses verified', 'Gas parameters cleared'],
      humanExplanation: `Validation cleared: All ${recordsCount} recipient allocations conform to Arc EVM standards. Treasury authorization granted for single-transaction atomic settlement.`,
      status: 'VERIFIED',
    };
  }

  const firstErr = errorItems[0]?.errors?.[0] || 'Invalid address format';
  const count = errorItems.length;

  const explanation = count <= 2
    ? `Compliance halt: ${count} invalid ${count === 1 ? 'entry' : 'entries'} detected (${firstErr}). Treasury lock engaged. Resolve flagged rows in the registry.`
    : `Compliance halt: ${count} validation discrepancies detected across the manifest (e.g. ${firstErr}). Treasury lock engaged to protect funds. Resolve flagged rows in the registry.`;

  return {
    thoughtProcess: ['Validation issues identified', 'Treasury safety lock engaged'],
    humanExplanation: explanation,
    status: 'ERRORS_FOUND',
  };
}