import * as XLSX from 'xlsx';
import { PayoutRecord, BatchSummary } from '../types';
import { parseTableWithAi } from './aiAgent';

export function formatCurrencyAmount(amount: any): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount ?? 0).replace(',', '.'));
  if (isNaN(num) || !isFinite(num) || num === 0) return '0.00';
  if (num >= 1 && Number.isInteger(num * 100)) {
    return num.toFixed(2);
  }
  const str = num.toFixed(6).replace(/\.?0+$/, '');
  const parts = str.split('.');
  if (parts.length === 1) return `${str}.00`;
  if (parts[1].length === 1) return `${str}0`;
  return str;
}

export function validateEvmAddress(address: string): { isValid: boolean; error?: string } {
  const trimmed = String(address ?? '').trim();
  if (!trimmed) return { isValid: false, error: 'Recipient wallet address is required' };

  if (/^T[a-zA-Z0-9]{33}$/.test(trimmed)) {
    return { isValid: false, error: 'TRON network address detected (starts with T). Arc EVM requires 0x...' };
  }
  if (/^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,39}$/.test(trimmed)) {
    return { isValid: false, error: 'Bitcoin network address detected. EVM 0x... address required.' };
  }
  if (/^[1-9A-HJ-NP-za-km-z]{32,44}$/.test(trimmed) && !trimmed.startsWith('0x')) {
    return { isValid: false, error: 'Solana address detected. EVM 0x... address required.' };
  }
  if (!trimmed.startsWith('0x')) {
    return { isValid: false, error: 'Address must begin with 0x prefix' };
  }
  if (trimmed.length < 42) {
    return { isValid: false, error: `Truncated address (${trimmed.length}/42 characters)` };
  }
  if (trimmed.length > 42) {
    return { isValid: false, error: `Address exceeds standard length (${trimmed.length}/42 characters)` };
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return { isValid: false, error: 'Invalid characters in hex address format' };
  }

  return { isValid: true };
}

export function parseCurrencyAmount(rawVal: any): { amount: number; error?: string } {
  const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal ?? '').replace(',', '.'));
  if (isNaN(num) || !isFinite(num) || num <= 0) {
    return { amount: 0, error: `Invalid payment amount: "${rawVal}"` };
  }
  return { amount: num };
}

export function sanitizeMemoId(rawMemo: any): { memo: string; error?: string } {
  const str = String(rawMemo ?? '').trim();
  if (!str) return { memo: 'NO-REF', error: 'Missing invoice reference (Arc Memo)' };
  if (str.length > 31) return { memo: str.slice(0, 31), error: 'Identifier truncated to 31 characters' };
  return { memo: str };
}

export async function parseExcelOrCsv(file: File): Promise<PayoutRecord[]> {
  let workbook: XLSX.WorkBook;

  if (file.name.endsWith('.csv')) {
    const text = await file.text();
    workbook = XLSX.read(text, { type: 'string', raw: true, codepage: 65001 });
  } else {
    const arrayBuffer = await file.arrayBuffer();
    workbook = XLSX.read(arrayBuffer, { type: 'array', raw: true, cellText: true });
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName || !workbook.Sheets[sheetName]) return [];

  const sheet = workbook.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
  if (rawRows.length < 2) return [];

  let aiRecords: any[] = [];
  try {
    aiRecords = await parseTableWithAi(rawRows);
  } catch (err) {
    console.warn('AI table parsing failed:', err);
    return [];
  }

  if (!aiRecords || aiRecords.length === 0) return [];

  const records: PayoutRecord[] = [];

  for (let i = 0; i < aiRecords.length; i++) {
    const item = aiRecords[i];
    const rowNum = i + 1;
    const addr = String(item.walletAddress || '').trim();
    const { amount, error: amountErr } = parseCurrencyAmount(item.amount);
    const { isValid: isAddrValid, error: addrErr } = validateEvmAddress(addr);

    const validationErrors: string[] = [];
    if (!isAddrValid && addrErr) validationErrors.push(addrErr);
    if (amountErr) validationErrors.push(amountErr);

    records.push({
      id: `row-${rowNum}`,
      rowNumber: rowNum,
      recipientName: item.recipientName || `Recipient #${i + 1}`,
      walletAddress: addr,
      amount,
      token: item.token === 'EURC' ? 'EURC' : 'USDC',
      invoiceRef: item.invoiceRef || `INV-${rowNum}`,
      rawAmountString: item.rawDescription || '',
      status: !isAddrValid || amountErr ? 'error' : 'valid',
      validationErrors,
    });
  }

  return records;
}

export function calculateBatchSummary(records: PayoutRecord[]): BatchSummary {
  let totalUsdc = 0;
  let totalEurc = 0;
  let validCount = 0;
  let errorCount = 0;

  for (const r of records) {
    if (r.status === 'error') {
      errorCount++;
    } else {
      validCount++;
      if (r.token === 'EURC') totalEurc += r.amount;
      else totalUsdc += r.amount;
    }
  }

  return {
    totalRecords: records.length,
    validRecords: validCount,
    errorRecords: errorCount,
    totalUsdc: Number(totalUsdc.toFixed(6)),
    totalEurc: Number(totalEurc.toFixed(6)),
    userEurcBalance: 0,
    willAutoConvertEur: false,
    eurRate: 0,
    rateSource: '',
    estimatedGasLabel: '< $0.01 USDC (Arc native gas)',
    estimatedGasUsdc: 0.005,
    hasFatalErrors: errorCount > 0,
  };
}