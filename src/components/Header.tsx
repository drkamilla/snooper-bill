import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  onLogoClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogoClick }) => {
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <header className="w-full py-2 sm:py-3 flex items-center justify-between bg-transparent select-none shrink-0">
      <div onClick={onLogoClick} className="cursor-pointer">
        <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-[#121316] uppercase leading-none">
          SNOOPER BILL
        </h1>
      </div>

      <div className="flex items-center gap-2.5">
        <ConnectButton 
          showBalance={false}
          chainStatus="icon"
          accountStatus="avatar"
        />

        {isConnected && (
          <button
            onClick={() => disconnect()}
            title="Disconnect wallet"
            className="flex items-center gap-1.5 rounded-xl border border-[#121316] bg-white hover:bg-red-50 hover:text-red-700 px-3 py-2 text-xs font-bold text-[#121316] transition-all shadow-[2px_2px_0px_#121316] active:translate-y-0.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        )}
      </div>
    </header>
  );
};