import React, { useState, useEffect } from 'react';
import { PayoutRecord } from '../types';
import { CheckCircle2, XCircle, FileText, X, AlertCircle, Pencil, RefreshCw } from 'lucide-react';
import { formatCurrencyAmount } from '../utils/tableParser';

interface SpreadsheetTableProps {
  records: PayoutRecord[];
  onUpdateRecord: (id: string, field: 'walletAddress' | 'amount' | 'invoiceRef' | 'token', value: any) => void;
  onRecheck: () => void;
  isAiLoading?: boolean;
}

export const SpreadsheetTable: React.FC<SpreadsheetTableProps> = ({
  records,
  onUpdateRecord,
  onRecheck,
  isAiLoading = false,
}) => {
  const [activeModalRecord, setActiveModalRecord] = useState<PayoutRecord | null>(null);
  const [amountInputStr, setAmountInputStr] = useState<string>('');

  useEffect(() => {
    if (activeModalRecord) {
      setAmountInputStr(String(activeModalRecord.amount ?? '0'));
    }
  }, [activeModalRecord?.id]);

  if (records.length === 0) return null;

  const hasErrors = records.some((r) => r.status === 'error');
  const errorCount = records.filter((r) => r.status === 'error').length;

  return (
    <>
      <div className="w-full h-full flex flex-col justify-between rounded-2xl md:rounded-3xl bg-white border border-[#121316] shadow-[4px_4px_0px_#121316] overflow-hidden select-none min-h-0">
        {hasErrors && (
          <div className="bg-amber-50 border-b border-amber-300 p-2 sm:px-4 flex items-center gap-2 text-amber-950 shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-xs">
              <strong className="font-bold text-amber-900">
                Validation Alerts: {errorCount} items flagged.
              </strong>{' '}
              Click any flagged row to modify address formats or amounts.
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#F4F3EE] border-b border-[#DCDAD3] text-[10px] sm:text-[11px] font-bold text-[#121316] uppercase tracking-wider z-10">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Recipient</th>
                <th className="py-2.5 px-3">Wallet (Arc EVM)</th>
                <th className="py-2.5 px-3 text-center">Amount</th>
                <th className="py-2.5 px-3">Arc Memo</th>
                <th className="py-2.5 pl-2 pr-5 sm:pr-6 text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E4DE] text-xs">
              {records.map((r) => {
                const isError = r.status === 'error';
                const truncatedAddress = r.walletAddress
                  ? `${r.walletAddress.slice(0, 8)}...${r.walletAddress.slice(-6)}`
                  : 'Not provided';

                return (
                  <tr
                    key={r.id}
                    className={`transition-colors ${
                      isError ? 'bg-amber-50/70 hover:bg-amber-100/60' : 'hover:bg-[#F7F7F2]'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono-num text-[11px] text-[#121316]/50 text-center">
                      {r.rowNumber}
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-[#121316] whitespace-nowrap">
                      {r.recipientName}
                    </td>

                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => setActiveModalRecord(r)}
                        className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-mono text-[11px] ${
                          isError
                            ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 font-bold'
                            : 'bg-[#F7F7F2] border-[#DCDAD3] text-[#121316] hover:border-[#0052FF] hover:bg-blue-50'
                        }`}
                        title="Click to edit recipient address"
                      >
                        <span>{truncatedAddress}</span>
                        <Pencil className="w-2.5 h-2.5 text-stone-400 group-hover:text-[#0052FF]" />
                      </button>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveModalRecord(r)}
                        className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DCDAD3] bg-[#F7F7F2] hover:border-[#0052FF] hover:bg-blue-50 transition-all cursor-pointer font-mono-num text-xs font-bold text-[#121316]"
                        title="Click to adjust amount or asset"
                      >
                        <span>{formatCurrencyAmount(r.amount)} {r.token}</span>
                        <Pencil className="w-2.5 h-2.5 text-stone-400 group-hover:text-[#0052FF]" />
                      </button>
                    </td>

                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => setActiveModalRecord(r)}
                        className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#DCDAD3] bg-[#F7F7F2] hover:border-[#0052FF] hover:bg-blue-50 transition-all cursor-pointer font-mono text-[11px] font-bold text-[#121316]"
                        title="Click to inspect Arc Memo reference"
                      >
                        <span className="truncate max-w-[120px]">{r.invoiceRef}</span>
                        <FileText className="w-3 h-3 text-stone-400 group-hover:text-[#0052FF] shrink-0" />
                      </button>
                    </td>

                    <td className="py-2.5 pl-2 pr-5 sm:pr-6 text-center">
                      {isError ? (
                        <div title={r.validationErrors.join('; ')} className="inline-flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                      ) : (
                        <div title="Address and value validated" className="inline-flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 bg-[#F4F3EE] border-t border-[#121316] flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#121316] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-emerald-700 flex items-center gap-1">
              ✓ Total Records: {records.length}
            </span>
            {hasErrors && (
              <span className="text-red-700 flex items-center gap-1">
                ✕ Flagged Issues: {errorCount}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onRecheck}
            disabled={isAiLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-[#F7F7F2] border border-[#121316] text-xs font-bold text-[#121316] transition-all shadow-[1px_1px_0px_#121316] active:translate-y-0.5 cursor-pointer disabled:opacity-50"
            title="Re-run compliance and validity audit"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0052FF] ${isAiLoading ? 'animate-spin' : ''}`} />
            <span>Re-verify Batch</span>
          </button>

          <div className="font-mono text-[#121316]">
            Arc Gas Estimate: <span className="font-bold text-emerald-700">&lt; $0.001</span>
          </div>
        </div>
      </div>

      {activeModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl md:rounded-3xl border-2 border-[#121316] bg-[#F7F7F2] p-5 sm:p-6 shadow-[8px_8px_0px_#121316]">
            <div className="flex items-center justify-between border-b border-[#121316] pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#121316]/60">
                  Record #{activeModalRecord.rowNumber}
                </span>
                <h3 className="font-display font-black text-[#121316] text-lg leading-tight mt-0.5">
                  {activeModalRecord.recipientName}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalRecord(null)}
                className="w-8 h-8 rounded-xl border border-[#121316] bg-white hover:bg-[#EAE8E1] flex items-center justify-center text-[#121316] shadow-[1px_1px_0px_#121316] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#121316]/70 uppercase tracking-wider mb-1">
                  Recipient Wallet Address (Arc EVM 0x...):
                </label>
                <input
                  type="text"
                  value={activeModalRecord.walletAddress}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateRecord(activeModalRecord.id, 'walletAddress', val);
                    setActiveModalRecord({ ...activeModalRecord, walletAddress: val });
                  }}
                  placeholder="0x..."
                  className="w-full rounded-xl border border-[#121316] bg-white px-3 py-2 font-mono text-xs text-[#121316] focus:border-[#0052FF] outline-none shadow-[2px_2px_0px_#121316]"
                />
                {activeModalRecord.validationErrors.length > 0 && (
                  <p className="mt-1 text-red-600 font-bold text-[11px]">
                    ⚠️ {activeModalRecord.validationErrors.join('; ')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#121316]/70 uppercase tracking-wider mb-1">
                    Payout Amount:
                  </label>
                  <input
                    type="text"
                    value={amountInputStr}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                        setAmountInputStr(val);
                        const cleanNum = parseFloat(val.replace(',', '.'));
                        const safeNum = isNaN(cleanNum) ? 0 : cleanNum;
                        onUpdateRecord(activeModalRecord.id, 'amount', safeNum);
                        setActiveModalRecord(prev => prev ? { ...prev, amount: safeNum } : null);
                      }
                    }}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-[#121316] bg-white px-3 py-2 font-mono text-xs font-bold text-[#121316] focus:border-[#0052FF] outline-none shadow-[2px_2px_0px_#121316]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#121316]/70 uppercase tracking-wider mb-1">
                    Settlement Asset:
                  </label>
                  <select
                    value={activeModalRecord.token}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateRecord(activeModalRecord.id, 'token', val);
                      setActiveModalRecord({ ...activeModalRecord, token: val });
                    }}
                    className="w-full rounded-xl border border-[#121316] bg-white px-3 py-2 font-mono text-xs font-bold text-[#121316] focus:border-[#0052FF] outline-none shadow-[2px_2px_0px_#121316] cursor-pointer"
                  >
                    <option value="USDC">USDC (Circle USD)</option>
                    <option value="EURC">EURC (Circle EUR)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#121316]/70 uppercase tracking-wider mb-1">
                  Invoice Ref / Arc Memo (bytes32):
                </label>
                <input
                  type="text"
                  value={activeModalRecord.invoiceRef}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateRecord(activeModalRecord.id, 'invoiceRef', val);
                    setActiveModalRecord({ ...activeModalRecord, invoiceRef: val });
                  }}
                  className="w-full rounded-xl border border-[#121316] bg-white px-3 py-2 font-mono text-xs font-bold text-[#121316] focus:border-[#0052FF] outline-none shadow-[2px_2px_0px_#121316]"
                />
              </div>

              {activeModalRecord.rawAmountString && (
                <div>
                  <label className="block text-[11px] font-bold text-[#121316]/70 uppercase tracking-wider mb-1">
                    Source Manifest Raw String:
                  </label>
                  <div className="rounded-xl bg-white border border-[#DCDAD3] p-2.5 text-[#121316] font-sans leading-relaxed text-[11px] max-h-24 overflow-y-auto">
                    {activeModalRecord.rawAmountString}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModalRecord(null)}
                className="rounded-xl bg-[#0052FF] hover:bg-[#0042D0] px-5 py-2.5 text-xs font-display font-black text-white uppercase tracking-tight transition-all shadow-[0_3px_0px_#0033B3] cursor-pointer"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};