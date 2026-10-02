import React from 'react';

export const ExcelWatermark: React.FC = () => {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl md:rounded-3xl opacity-[0.15] select-none"
      aria-hidden="true"
    >
      <div className="w-full h-full flex flex-col font-mono text-[11px] leading-tight text-[#121316]">
        <div className="h-6 bg-[#107C41] flex items-center px-3 text-white text-[10px] font-sans font-semibold tracking-wide">
          <span>Excel — snooper_bill_arc_settlement_export.xlsx</span>
        </div>

        <div className="grid grid-cols-[36px_1.2fr_1.2fr_1.6fr_1.3fr_1.7fr] bg-[#E8E7E0] border-b border-[#C8C6BD] font-semibold text-center py-1">
          <div className="border-r border-[#C8C6BD]" />
          <div className="border-r border-[#C8C6BD] px-1 truncate">A (Tx Hash)</div>
          <div className="border-r border-[#C8C6BD] px-1 truncate">B (Method)</div>
          <div className="border-r border-[#C8C6BD] px-1 truncate">C (Recipient Address)</div>
          <div className="border-r border-[#C8C6BD] px-1 truncate">D (Amount Asset)</div>
          <div className="px-1 truncate">E (Status / Arc Block)</div>
        </div>

        <div className="grid grid-cols-[36px_1.2fr_1.2fr_1.6fr_1.3fr_1.7fr] border-b border-[#D8D6CD] py-2 px-1">
          <div className="text-center font-semibold bg-[#E8E7E0] text-[10px] py-0.5 border-r border-[#C8C6BD]">1</div>
          <div className="px-2 truncate font-mono text-[#0052FF]">0x8f2a...4b19</div>
          <div className="px-2 truncate font-medium">BatchTransfer</div>
          <div className="px-2 truncate font-mono">0x71C849A2dE518a27B...</div>
          <div className="px-2 text-right font-bold font-mono">14,250.00 USDC</div>
          <div className="px-2 truncate text-emerald-800 font-medium">#504201 • Finalized (&lt;0.8s)</div>
        </div>

        <div className="grid grid-cols-[36px_1.2fr_1.2fr_1.6fr_1.3fr_1.7fr] border-b border-[#D8D6CD] py-2 px-1 bg-black/[0.015]">
          <div className="text-center font-semibold bg-[#E8E7E0] text-[10px] py-0.5 border-r border-[#C8C6BD]">2</div>
          <div className="px-2 truncate font-mono text-[#0052FF]">0x3d11...c902</div>
          <div className="px-2 truncate font-medium">BatchPayout</div>
          <div className="px-2 truncate font-mono">0x3cD2907E126938927...</div>
          <div className="px-2 text-right font-bold font-mono">6,800.00 USDC</div>
          <div className="px-2 truncate text-emerald-800 font-medium">#504202 • Finalized (&lt;0.6s)</div>
        </div>

        <div className="grid grid-cols-[36px_1.2fr_1.2fr_1.6fr_1.3fr_1.7fr] border-b border-[#D8D6CD] py-2 px-1">
          <div className="text-center font-semibold bg-[#E8E7E0] text-[10px] py-0.5 border-r border-[#C8C6BD]">3</div>
          <div className="px-2 truncate font-mono text-[#0052FF]">0x9a44...ee71</div>
          <div className="px-2 truncate font-medium">BatchTransfer</div>
          <div className="px-2 truncate font-mono">0x99aEc871D6a241885...</div>
          <div className="px-2 text-right font-bold font-mono">5,120.00 EURC</div>
          <div className="px-2 truncate text-emerald-800 font-medium">#504203 • Finalized (&lt;0.7s)</div>
        </div>

        <div className="grid grid-cols-[36px_1.2fr_1.2fr_1.6fr_1.3fr_1.7fr] border-b border-[#D8D6CD] py-2 px-1 bg-black/[0.015]">
          <div className="text-center font-semibold bg-[#E8E7E0] text-[10px] py-0.5 border-r border-[#C8C6BD]">4</div>
          <div className="px-2 truncate font-mono text-[#0052FF]">0x1f02...6a88</div>
          <div className="px-2 truncate font-medium">BatchPayout</div>
          <div className="px-2 truncate font-mono">0x1f27AA09b5311894a...</div>
          <div className="px-2 text-right font-bold font-mono">8,300.00 USDC</div>
          <div className="px-2 truncate text-emerald-800 font-medium">#504204 • Finalized (&lt;0.5s)</div>
        </div>
      </div>
    </div>
  );
};