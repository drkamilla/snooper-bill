import React from 'react';
import { ExecutionReceipt } from '../types';
import { generateSettlementPdf } from '../utils/pdfGenerator';
import { formatCurrencyAmount } from '../utils/tableParser';
import * as XLSX from 'xlsx';
import { CheckCircle2, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { useAccount } from 'wagmi';

interface ReceiptSuccessViewProps {
  receipt: ExecutionReceipt;
  onReset: () => void;
}

export const ReceiptSuccessView: React.FC<ReceiptSuccessViewProps> = ({ receipt, onReset }) => {
  const { chain } = useAccount();
  const explorerBaseUrl = chain?.blockExplorers?.default?.url || 'https://explorer.arc.io';

  const handleExportUpdatedExcel = () => {
    const data = receipt.records.map((r) => {
      const isEur = (r.token || '').toUpperCase().includes('EUR');
      const tx = isEur ? (receipt.eurcTxHash || receipt.txHash) : (receipt.usdcTxHash || receipt.txHash);
      const txUrl = tx ? `${explorerBaseUrl}/tx/${tx}` : '—';

      return {
        '#': r.rowNumber,
        'Recipient': r.recipientName,
        'Original Reference': r.rawAmountString || '—',
        'Invoice Memo': r.invoiceRef || '—',
        'Amount': r.amount,
        'Asset': r.token || 'USDC',
        'Recipient Address': r.walletAddress,
        'Transaction Explorer': txUrl,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 5 },
      { wch: 22 },
      { wch: 35 },
      { wch: 14 },
      { wch: 12 },
      { wch: 8 },
      { wch: 44 },
      { wch: 60 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Settlement Batch');

    const fileHash = (receipt.txHash || receipt.usdcTxHash || 'settlement').slice(0, 8);
    XLSX.writeFile(wb, `snooper_bill_batch_${fileHash}.xlsx`);
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-[#111827] p-8 text-center max-w-2xl mx-auto shadow-2xl">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4">
        <CheckCircle2 className="h-8 w-8" />
      </div>

      <h2 className="text-xl font-bold text-white">Batch Settlement Complete</h2>
      <p className="mt-1 text-xs text-gray-400">
        All transfers have been confirmed and cryptographically verified on Arc.
      </p>

      <div className="my-6 rounded-lg bg-gray-900 p-4 border border-gray-800 text-left font-mono text-xs space-y-2.5">
        {receipt.usdcTxHash && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400">USDC Settlement Tx:</span>
            <a
              href={`${explorerBaseUrl}/tx/${receipt.usdcTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#0066F5] hover:underline flex items-center space-x-1"
            >
              <span>{receipt.usdcTxHash.slice(0, 10)}...{receipt.usdcTxHash.slice(-8)}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {receipt.eurcTxHash && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400">EURC Settlement Tx:</span>
            <a
              href={`${explorerBaseUrl}/tx/${receipt.eurcTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline flex items-center space-x-1"
            >
              <span>{receipt.eurcTxHash.slice(0, 10)}...{receipt.eurcTxHash.slice(-8)}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        <div className="pt-2 border-t border-gray-800 space-y-1">
          {receipt.totalUsdcPaid > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Total Settled (USDC):</span>
              <span className="text-emerald-400 font-bold">${formatCurrencyAmount(receipt.totalUsdcPaid)} USDC</span>
            </div>
          )}
          {receipt.totalEurcPaid > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Total Settled (EURC):</span>
              <span className="text-blue-400 font-bold">{formatCurrencyAmount(receipt.totalEurcPaid)} EURC</span>
            </div>
          )}
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-500">Arc Gas Fee:</span>
            <span className="text-gray-300">${receipt.gasPaidUsdc.toFixed(6)} USDC</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => generateSettlementPdf(receipt)}
          className="flex items-center justify-center space-x-2 rounded-lg bg-[#0066F5] hover:bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-blue-500/20 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Audit Statement (PDF)</span>
        </button>

        <button
          onClick={handleExportUpdatedExcel}
          className="flex items-center justify-center space-x-2 rounded-lg bg-gray-800 hover:bg-gray-700 px-5 py-2.5 text-xs font-semibold text-white transition border border-gray-700 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Settlement Ledger (Excel)</span>
        </button>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-800">
        <button
          onClick={onReset}
          className="text-xs text-gray-400 hover:text-white flex items-center space-x-1 mx-auto transition cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Process New Manifest</span>
        </button>
      </div>
    </div>
  );
};