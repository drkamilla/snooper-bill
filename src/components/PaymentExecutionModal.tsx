import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { PayoutRecord, ExecutionReceipt } from '../types';
import { executeBatchOnArc } from '../utils/arcWeb3';
import { arc } from '../wagmi';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, Network } from 'lucide-react';

interface PaymentExecutionModalProps {
  records: PayoutRecord[];
  onSuccess: (receipt: ExecutionReceipt) => void;
  onClose: () => void;
}

export const PaymentExecutionModal: React.FC<PaymentExecutionModalProps> = ({
  records,
  onSuccess,
  onClose,
}) => {
  const { chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const isArcNetwork = chainId === 5042;

  const [stage, setStage] = useState<'checking' | 'approving' | 'settling' | 'done'>('checking');
  const [statusMessage, setStatusMessage] = useState<string>('Preparing batch for settlement...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const executionStartedRef = useRef(false);

  const handleStart = async () => {
    try {
      setErrorMessage(null);

      const items = records.map((r) => ({
        recipient: r.walletAddress,
        amount: r.amount,
        invoiceRef: r.invoiceRef,
        token: r.token,
      }));

      const result = await executeBatchOnArc(items, (newStage, msg) => {
        setStage(newStage);
        if (msg) setStatusMessage(msg);
      });

      setStage('done');

      setTimeout(() => {
        const receipt: ExecutionReceipt = {
          usdcTxHash: result.usdcTxHash,
          eurcTxHash: result.eurcTxHash,
          txHash: result.primaryTxHash,
          blockNumber: result.blockNumber,
          timestamp: new Date().toISOString(),
          network: 'Arc Mainnet',
          totalUsdcPaid: result.totalUsdcPaid,
          totalEurcPaid: result.totalEurcPaid,
          wasConverted: result.wasConverted,
          gasPaidUsdc: result.gasPaidUsdc,
          records,
        };
        onSuccess(receipt);
      }, 1000);
    } catch (err: any) {
      console.error('Payment execution error:', err);
      if (err.message?.includes('User rejected') || err.message?.includes('denied')) {
        setErrorMessage('Transaction request was rejected by your wallet. Account balances remain untouched.');
      } else {
        setErrorMessage(err.shortMessage || err.message || 'Transaction settlement failed.');
      }
    }
  };

  const handleRetry = () => {
    executionStartedRef.current = false;
    handleStart();
  };

  useEffect(() => {
    if (!isArcNetwork) return;
    if (executionStartedRef.current) return;
    executionStartedRef.current = true;
    handleStart();
  }, [isArcNetwork]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#111827] p-6 shadow-2xl text-center">
        {!isArcNetwork ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
              <Network className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400">
                Network Check
              </span>
              <h3 className="text-base font-bold text-white">Switch to Arc Mainnet</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your wallet is connected to an unsupported network. Snooper Bill requires Arc Mainnet for native USDC gas settlement.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => switchChain({ chainId: arc.id })}
                disabled={isSwitching}
                className="rounded-lg bg-[#0066F5] hover:bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white transition cursor-pointer flex items-center gap-1.5"
              >
                {isSwitching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Switch to Arc</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2.5 text-xs font-semibold text-gray-300 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-amber-400" />
            <h3 className="text-base font-bold text-white">Execution Halted</h3>
            <p className="text-xs text-gray-300 bg-gray-900 border border-gray-800 rounded-lg p-3 leading-relaxed">
              {errorMessage}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={handleRetry}
                className="rounded-lg bg-[#0066F5] hover:bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white transition cursor-pointer"
              >
                Retry Execution
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2.5 text-xs font-semibold text-gray-300 transition cursor-pointer"
              >
                Return to Registry
              </button>
            </div>
          </div>
        ) : stage === 'done' ? (
          <div className="space-y-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 animate-bounce" />
            <h3 className="text-base font-bold text-white">Batch Successfully Settled</h3>
            <p className="text-xs text-gray-400">Compiling official reconciliation statement...</p>
          </div>
        ) : stage === 'approving' ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-[#0066F5]">
              <ShieldCheck className="h-7 w-7 animate-pulse" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-400">
                Asset Authorization
              </span>
              <h3 className="text-base font-bold text-white">Approve Contract Allowance</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {statusMessage || 'Please sign the contract approval request in your wallet to enable single-transaction batch execution.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-10 w-10 text-emerald-400 animate-spin" />
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400">
                {stage === 'checking' ? 'Preparation' : 'Execution'}
              </span>
              <h3 className="text-base font-bold text-white">
                {stage === 'checking' ? 'Validating Arc Registry' : 'Executing Atomic Batch'}
              </h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {stage === 'checking'
                ? statusMessage
                : 'Confirm the transaction in your connected wallet. All recipient allocations will be finalized on-chain.'}
            </p>
            <p className="text-[11px] text-gray-500 font-mono">
              Network gas fees are settled in native USDC
            </p>
          </div>
        )}
      </div>
    </div>
  );
};