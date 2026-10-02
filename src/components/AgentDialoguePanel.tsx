import React, { useState, useRef, useEffect } from 'react';
import { BatchSummary, PayoutRecord } from '../types';
import { MascotClippy, MascotMood } from './MascotClippy';
import { ChatMessage, sendChatMessageToAi } from '../utils/aiAgent';
import { formatCurrencyAmount } from '../utils/tableParser';
import { ArrowRight, Loader2, Send, MessageSquare } from 'lucide-react';

interface AgentDialoguePanelProps {
  summary: BatchSummary;
  records: PayoutRecord[];
  aiMessage: string;
  isAiLoading: boolean;
  onExecuteClick: () => void;
}

export const AgentDialoguePanel: React.FC<AgentDialoguePanelProps> = ({
  summary,
  records,
  aiMessage,
  isAiLoading,
  onExecuteClick,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const mascotMood: MascotMood = (isAiLoading || isChatLoading)
    ? 'scanning'
    : summary.hasFatalErrors
    ? 'error'
    : 'success';

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isChatLoading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputVal;
    if (!textToSend.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputVal('');
    setIsChatLoading(true);

    const reply = await sendChatMessageToAi(textToSend, messages, records);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsChatLoading(false);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between rounded-2xl md:rounded-3xl bg-[#F4F3EE] border-2 border-[#121316] shadow-[4px_4px_0px_#121316] p-3.5 sm:p-4 select-none overflow-hidden min-h-0">
      <div className="flex-1 flex flex-col items-center justify-between min-h-0 overflow-hidden">
        <div className="relative w-full bg-white border border-[#121316] rounded-2xl p-2.5 sm:p-3 shadow-[2px_2px_0px_#121316] text-center shrink-0">
          <div className="flex items-center justify-between gap-2 pb-1 mb-1 border-b border-[#E5E4DE]">
            <span className="font-display font-black text-xs text-[#121316] tracking-tight uppercase">
              Snooper Bill
            </span>
            <span
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                summary.hasFatalErrors
                  ? 'bg-red-50 text-red-900 border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {summary.hasFatalErrors ? 'ERRORS DETECTED' : 'VERIFIED & APPROVED'}
            </span>
          </div>

          <h3 className="font-display font-black text-sm text-[#121316] tracking-tight leading-snug">
            {summary.hasFatalErrors ? 'Action Required: Batch Issues' : 'Batch Verified & Approved'}
          </h3>

          <div className="mt-1 text-xs text-[#121316]/85 font-medium leading-relaxed">
            {isAiLoading ? (
              <span className="flex items-center justify-center gap-1.5 text-blue-700 py-0.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Auditing payout registry...
              </span>
            ) : (
              aiMessage || 'All recipient addresses verified for Arc EVM execution. Single-transaction atomic batch authorized with native USDC gas.'
            )}
          </div>

          <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-[#121316] rotate-45" />
        </div>

        <div className="flex-1 w-full min-h-0 flex items-center justify-center py-1 overflow-hidden">
          <MascotClippy
            mood={mascotMood}
            sizeClassName="h-full w-auto max-h-[175px] max-w-[175px] aspect-square"
          />
        </div>
      </div>

      <div className="shrink-0 flex flex-col gap-1.5 mt-auto pt-1">
        <div className="rounded-xl border border-[#121316] bg-white p-2.5 space-y-1.5 shadow-[2px_2px_0px_#121316]">
          <div className="flex items-center text-[#121316] text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5 text-[#0052FF]" />
              <span>Ask Snooper Bill:</span>
            </span>
          </div>

          {messages.length > 0 && (
            <div
              ref={chatScrollRef}
              className="max-h-16 overflow-y-auto space-y-1 text-xs font-sans pr-1 no-scrollbar"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-1.5 rounded-lg ${
                    m.sender === 'user'
                      ? 'bg-[#0052FF] text-white ml-5 text-right'
                      : 'bg-[#F7F7F2] border border-[#DCDAD3] text-[#121316] mr-3'
                  }`}
                >
                  <p className="leading-tight">{m.text}</p>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center gap-1 text-stone-500 text-[10px]">
                  <Loader2 className="h-3 w-3 animate-spin text-[#0052FF]" />
                  <span>Generating response...</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Query Arc Mainnet gas, deterministic finality, or batch entries..."
              className="flex-1 rounded-lg border border-[#DCDAD3] bg-[#F7F7F2] px-2.5 py-1 text-xs text-[#121316] outline-none focus:border-[#0052FF] focus:bg-white transition"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isChatLoading || !inputVal.trim()}
              className="rounded-lg bg-[#121316] hover:bg-[#2B2D33] p-1.5 text-white transition disabled:opacity-40 cursor-pointer"
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>

        {!summary.hasFatalErrors && (
          <div className="rounded-xl bg-white border border-[#121316] p-2 space-y-0.5 font-mono text-xs shadow-[2px_2px_0px_#121316]">
            <div className="text-[10px] font-bold text-[#121316]/60 uppercase tracking-wider pb-0.5 border-b border-[#E5E4DE] font-sans">
              Total Debit Summary:
            </div>

            {summary.totalUsdc > 0 && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#121316]/70">USDC Allocation:</span>
                <span className="font-bold text-[#121316]">
                  ${formatCurrencyAmount(summary.totalUsdc)} USDC
                </span>
              </div>
            )}

            {summary.totalEurc > 0 && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#121316]/70">EURC Allocation:</span>
                <span className="font-bold text-blue-700">
                  {formatCurrencyAmount(summary.totalEurc)} EURC
                </span>
              </div>
            )}

            <div className="flex justify-between text-[10px] text-[#121316]/70 pt-0.5 border-t border-[#E5E4DE]">
              <span>Arc Network Gas (Native USDC):</span>
              <span className="font-bold text-emerald-700">&lt; $0.001</span>
            </div>
          </div>
        )}

        <div>
          {summary.hasFatalErrors ? (
            <div className="p-2 bg-red-100 border border-red-300 rounded-xl text-center">
              <span className="font-display font-black text-xs text-red-900 uppercase tracking-tight block">
                Execution Locked
              </span>
              <span className="text-[10px] text-red-800 font-medium">
                Resolve validation errors in the registry table to proceed
              </span>
            </div>
          ) : (
            <button
              onClick={onExecuteClick}
              className="w-full bg-[#0052FF] hover:bg-[#0042D0] active:translate-y-0.5 text-white font-display font-black text-xs sm:text-sm py-2 px-4 rounded-xl transition-all shadow-[0_3px_0px_#0033B3] flex items-center justify-center gap-2 cursor-pointer uppercase tracking-tight"
            >
              <span>Execute Batch ({summary.validRecords})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};