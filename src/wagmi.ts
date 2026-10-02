import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

export const arc = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        'https://rpc.drpc.mainnet.arc.io',
        'https://rpc.quicknode.mainnet.arc.io',
        'https://rpc.mainnet.arc.io',
      ],
    },
    public: {
      http: [
        'https://rpc.drpc.mainnet.arc.io',
        'https://rpc.quicknode.mainnet.arc.io',
        'https://rpc.mainnet.arc.io',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: 'https://explorer.arc.io',
    },
  },
});

export const arcMainnet = arc;
export const arcTestnet = arc;

export const config = getDefaultConfig({
  appName: 'SNOOPER BILL',
  projectId: 'b37caf0e2ce3bab64bc4bc08c17f4972',
  chains: [arc],
  ssr: false,
});