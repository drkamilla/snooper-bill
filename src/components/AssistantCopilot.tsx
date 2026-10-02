import React from 'react';
import { Bot, AlertTriangle, CheckCircle } from 'lucide-react';

interface AssistantCopilotProps {
  onLoadSample: (hasErrors: boolean) => void;
}

export const AssistantCopilot: React.FC<AssistantCopilotProps> = ({ onLoadSample }) => {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
      <div className="flex items-start space-x-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 text-[#0066F5]">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-white text-sm">Settlement Copilot</h3>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.2 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
              Online
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-300 leading-relaxed">
            Upload a payout registry to initiate automated compliance verification. Snooper Bill Engine audits EVM address formats, intercepts incompatible non-EVM chains (TRON, Solana), standardizes decimal notations, and constructs on-chain <strong>Arc Memos</strong> for accounting reconciliation.
          </p>

          <div className="mt-4 pt-3 border-t border-gray-800">
            <span className="text-[11px] font-medium text-gray-400 block mb-2">
              Benchmark Manifests:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onLoadSample(true)}
                className="flex items-center space-x-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 text-xs text-red-300 transition"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <span>Fatal Errors Sample (TRON / Malformed)</span>
              </button>
              <button
                onClick={() => onLoadSample(false)}
                className="flex items-center space-x-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300 transition"
              >
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>Verified Clean Batch (Ready for Settlement)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};