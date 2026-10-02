import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { SpreadsheetTable } from './components/SpreadsheetTable';
import { AgentDialoguePanel } from './components/AgentDialoguePanel';
import { PaymentExecutionModal } from './components/PaymentExecutionModal';
import { ReceiptSuccessView } from './components/ReceiptSuccessView';
import { MascotClippy } from './components/MascotClippy';
import { ExcelWatermark } from './components/ExcelWatermark';
import { PayoutRecord, BatchSummary, ExecutionReceipt } from './types';
import {
  parseExcelOrCsv,
  calculateBatchSummary,
  validateEvmAddress,
  parseCurrencyAmount,
  sanitizeMemoId,
} from './utils/tableParser';
import { runArcAgentAudit } from './utils/aiAgent';
import { UploadCloud, Download, RefreshCw, Loader2 } from 'lucide-react';

export function App() {
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  const [records, setRecords] = useState<PayoutRecord[]>([]);
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [receipt, setReceipt] = useState<ExecutionReceipt | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!isConnected) return;
    idleTimerRef.current = setTimeout(() => {
      disconnect();
    }, 600000);
  }, [isConnected, disconnect]);

  useEffect(() => {
    if (!isConnected) return;

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetIdleTimer, { passive: true }));

    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
    };
  }, [isConnected, resetIdleTimer]);

  const handleResetToHome = () => {
    setReceipt(null);
    setRecords([]);
    setSummary(null);
    setAiMessage('');
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExecuteClick = () => {
    if (!isConnected) {
      if (openConnectModal) openConnectModal();
      return;
    }
    setIsExecuting(true);
  };

  const handleProcessFile = async (file: File) => {
    if (isProcessingRef.current || isAiLoading) return;
    isProcessingRef.current = true;
    setIsAiLoading(true);

    try {
      setFileName(file.name);
      const parsed = await parseExcelOrCsv(file);

      if (!parsed || parsed.length === 0) {
        setIsAiLoading(false);
        isProcessingRef.current = false;
        setAiMessage('No valid data rows detected in spreadsheet. Please verify file format.');
        return;
      }

      const summ = calculateBatchSummary(parsed);
      setRecords(parsed);
      setSummary(summ);

      const payloadForAi = parsed.map((r) => ({
        row: r.rowNumber,
        name: r.recipientName,
        address: r.walletAddress,
        amount: r.amount,
        token: r.token,
        memo: r.invoiceRef,
        errors: r.validationErrors,
      }));

      const aiResult = await runArcAgentAudit(parsed.length, payloadForAi);
      setAiMessage(aiResult.humanExplanation);
    } catch (err) {
      console.error('Error processing file:', err);
      setAiMessage('Unable to process spreadsheet manifest. Please verify format and try again.');
    } finally {
      setIsAiLoading(false);
      isProcessingRef.current = false;
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRecheckTable = async () => {
    if (records.length === 0) return;
    setIsAiLoading(true);

    const newSummary = calculateBatchSummary(records);
    setSummary(newSummary);

    const payload = records.map((r) => ({
      row: r.rowNumber,
      name: r.recipientName,
      address: r.walletAddress,
      amount: r.amount,
      token: r.token,
      memo: r.invoiceRef,
      errors: r.validationErrors,
    }));

    const result = await runArcAgentAudit(records.length, payload);
    setAiMessage(result.humanExplanation);
    setIsAiLoading(false);
  };

  const handleDownloadCsvTemplate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const csvContent =
      'Counterparty,Amount,Currency,Wallet Address (Arc EVM),Invoice Ref (Arc Memo),Memo\n' +
      '"Alex Miller",1500,USDC,0x71C849A2dE518a27B75d9e5d4A93690Ef8913b82,INV-2026-01,"Engineering retainer"\n' +
      '"Sophia Laurent",2200,EURC,0x3cD29B7F1269389278912d09E67268d06742512a,INV-2026-02,"Interface design"\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Snooper_Bill_Batch_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateRecord = async (
    id: string,
    field: 'walletAddress' | 'amount' | 'invoiceRef' | 'token',
    value: any
  ) => {
    const updated = records.map((r) => {
      if (r.id !== id) return r;

      const newRec = { ...r, [field]: value };
      const { isValid: isAddrValid, error: addrErr } = validateEvmAddress(newRec.walletAddress);
      const { amount, error: amountErr } = parseCurrencyAmount(newRec.amount);
      const { memo, error: memoErr } = sanitizeMemoId(newRec.invoiceRef);

      const errs: string[] = [];
      if (!isAddrValid && addrErr) errs.push(addrErr);
      if (amountErr) errs.push(amountErr);
      if (memoErr) errs.push(memoErr);

      newRec.validationErrors = errs;
      newRec.status = !isAddrValid || amountErr ? 'error' : memoErr ? 'warning' : 'valid';
      if (!amountErr) newRec.amount = amount;
      newRec.invoiceRef = memo;

      return newRec;
    });

    setRecords(updated);
    const newSummary = calculateBatchSummary(updated);
    setSummary(newSummary);

    if (newSummary.hasFatalErrors) {
      const errorRows = updated.filter((r) => r.status === 'error');
      const firstError = errorRows[0]?.validationErrors?.[0] || 'invalid credentials';
      setAiMessage(
        `Compliance halt: Found ${errorRows.length} ${
          errorRows.length === 1 ? 'error' : 'errors'
        }: ${firstError}. Execution locked to protect treasury funds. Resolve flagged rows.`
      );
    } else {
      setAiMessage(
        'Validation cleared: All validation checks passed. Batch manifest verified and authorized for Arc Network settlement.'
      );
    }
  };

  return (
    <div className="h-screen max-h-screen w-full bg-[#F7F7F2] text-[#121316] antialiased flex flex-col p-4 sm:p-6 overflow-hidden">
      <div className="w-full max-w-[1400px] max-h-[840px] mx-auto my-auto flex flex-col flex-1 min-h-0">
        {receipt ? (
          <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center py-4">
            <ReceiptSuccessView receipt={receipt} onReset={handleResetToHome} />
          </div>
        ) : (
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-0 py-2">
            <div className="lg:col-span-7 w-full flex flex-col min-h-0 h-full">
              {records.length === 0 ? (
                <div className="w-full h-full flex flex-col justify-between min-h-0">
                  <div
                    onClick={() => {
                      if (!isAiLoading) fileInputRef.current?.click();
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!isAiLoading) setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (!isAiLoading && e.dataTransfer.files?.[0]) {
                        handleProcessFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`relative group w-full flex-1 flex flex-col justify-center p-6 sm:p-8 rounded-2xl md:rounded-3xl bg-white border-[1.5px] transition-all duration-200 select-none overflow-hidden min-h-0 ${
                      isAiLoading
                        ? 'cursor-wait border-[#0052FF]/40 bg-[#FBFBFA]'
                        : isDragging
                        ? 'cursor-pointer border-[#0052FF] bg-[#F4F7FF] ring-4 ring-[#0052FF]/10 scale-[1.003]'
                        : 'cursor-pointer border-[#121316]/20 hover:border-[#121316] hover:shadow-[4px_4px_0px_#121316]'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      disabled={isAiLoading}
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleProcessFile(e.target.files[0]);
                      }}
                      className="hidden"
                    />

                    <ExcelWatermark />

                    {isAiLoading ? (
                      <div className="relative z-10 flex flex-col items-center text-center my-auto py-4 pointer-events-none">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border border-[#121316] bg-[#F7F7F2] text-[#0052FF] shadow-[3px_3px_0px_#121316]">
                          <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin stroke-[2]" />
                        </div>

                        <h2 className="font-display font-black text-xl sm:text-2xl text-[#121316] mt-5 tracking-tight leading-tight max-w-md truncate px-2">
                          {fileName || 'Uploading manifest...'}
                        </h2>

                        <p className="mt-2 text-xs sm:text-sm text-[#121316]/70 font-medium">
                          Auditing batch manifest...
                        </p>
                      </div>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center text-center my-auto py-4 pointer-events-none">
                        <div
                          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border border-[#121316] transition-transform duration-200 shadow-[3px_3px_0px_#121316] ${
                            isDragging
                              ? 'bg-[#0052FF] text-white scale-105'
                              : 'bg-[#F7F7F2] text-[#121316] group-hover:scale-105'
                          }`}
                        >
                          <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.8]" />
                        </div>

                        <h2 className="font-display font-black text-2xl sm:text-[28px] text-[#121316] mt-5 tracking-tight leading-tight max-w-lg">
                          Upload Enterprise Payout Manifest
                        </h2>

                        <p className="mt-3 text-sm sm:text-base text-[#121316] max-w-md font-medium leading-relaxed">
                          Drag and drop your spreadsheet{' '}
                          <strong className="font-bold underline decoration-[#0052FF] underline-offset-2">
                            .xlsx
                          </strong>{' '}
                          or{' '}
                          <strong className="font-bold underline decoration-[#0052FF] underline-offset-2">
                            .csv
                          </strong>{' '}
                          file here, or browse files
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex justify-center shrink-0">
                    <button
                      type="button"
                      disabled={isAiLoading}
                      onClick={handleDownloadCsvTemplate}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[#121316] hover:text-[#0052FF] bg-white border border-[#DCDAD3] hover:border-[#121316] px-4 py-2 rounded-xl transition-all shadow-[1px_1px_0px_#121316]/20 hover:shadow-[2px_2px_0px_#121316] cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5 text-[#0052FF]" />
                      <span>↓ Download CSV Manifest Template</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 h-full space-y-2">
                  <div className="flex items-center justify-between shrink-0 gap-3 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-5 h-5 rounded bg-[#107C41] text-white flex items-center justify-center font-display font-black text-[10px] shrink-0 shadow-xs">
                        X
                      </div>
                      <span
                        title={fileName}
                        className="font-display font-black text-sm text-[#121316] truncate block"
                      >
                        {fileName || 'Payout Manifest'}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#121316]/60 shrink-0">
                        ({records.length})
                      </span>
                    </div>

                    <label className="text-xs font-bold text-[#0052FF] hover:underline cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap bg-white border border-[#DCDAD3] hover:border-[#121316] px-2.5 py-1 rounded-lg shadow-[1px_1px_0px_#121316]/20">
                      <RefreshCw className="h-3 w-3" />
                      <span>Replace File</span>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleProcessFile(e.target.files[0]);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex-1 min-h-0 h-full">
                    <SpreadsheetTable
                      records={records}
                      onUpdateRecord={handleUpdateRecord}
                      onRecheck={handleRecheckTable}
                      isAiLoading={isAiLoading}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 w-full flex flex-col min-h-0 h-full">
              {summary ? (
                <AgentDialoguePanel
                  summary={summary}
                  records={records}
                  aiMessage={aiMessage}
                  isAiLoading={isAiLoading}
                  onExecuteClick={handleExecuteClick}
                />
              ) : (
                <div className="w-full h-full flex flex-col justify-between items-center rounded-2xl md:rounded-3xl bg-[#F4F3EE] border-2 border-[#121316] shadow-[4px_4px_0px_#121316] p-6 sm:p-8 select-none">
                  <div className="relative w-full max-w-sm bg-white border border-[#121316] rounded-2xl p-4 shadow-[2px_2px_0px_#121316] animate-bubble text-center shrink-0">
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#E5E4DE]">
                      <span className="font-display font-black text-xs text-[#121316] tracking-tight uppercase">
                        Snooper Bill
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-colors ${
                          isAiLoading
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {isAiLoading ? 'AUDITING' : 'STANDBY'}
                      </span>
                    </div>

                    <h3 className="font-display font-black text-base text-[#121316] tracking-tight leading-snug">
                      {isAiLoading ? 'Auditing Manifest' : 'Snooper Bill Audit Engine'}
                    </h3>

                    <p className="mt-1 text-xs text-[#121316]/80 font-medium leading-relaxed">
                      {isAiLoading
                        ? 'Verifying EVM address checksums, token contract addresses, and deterministic gas allocations on Arc Mainnet.'
                        : aiMessage ||
                          'Upload an enterprise payout manifest (.xlsx or .csv) to initiate compliance and deterministic finality verification on Arc Mainnet.'}
                    </p>

                    <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-[#121316] rotate-45" />
                  </div>

                  <div className="my-auto flex items-center justify-center">
                    <MascotClippy
                      mood={isAiLoading ? 'scanning' : 'idle'}
                      sizeClassName="w-56 h-56 sm:w-64 sm:h-64"
                    />
                  </div>

                  <div className="w-full h-2 shrink-0" />
                </div>
              )}
            </div>
          </main>
        )}
      </div>

      {isExecuting && (
        <PaymentExecutionModal
          records={records}
          onSuccess={(rec) => {
            setIsExecuting(false);
            setReceipt(rec);
          }}
          onClose={() => setIsExecuting(false)}
        />
      )}
    </div>
  );
}

export default App;