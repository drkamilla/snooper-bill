import { parseUnits, stringToHex, pad, maxUint256, formatUnits, getAddress } from 'viem';
import { writeContract, readContract, waitForTransactionReceipt, getAccount } from '@wagmi/core';
import { config } from '../wagmi';

export const ARC_TESTNET_USDC = '0x3600000000000000000000000000000000000000';
export const ARC_TESTNET_EURC = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';
export const ARC_BATCH_PAYOUT_ADDRESS = '0x0a14C17610C2d8559ba770CcC0798D080A62deD0';

export const ARC_MAINNET_USDC = '0x3600000000000000000000000000000000000000';
export const ARC_MAINNET_EURC = '0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1';
export const ARC_MAINNET_BATCH_PAYOUT_ADDRESS = '0x0a14C17610C2d8559ba770CcC0798D080A62deD0';

export const ARC_CONFIG: Record<number, { usdc: `0x${string}`; eurc: `0x${string}`; batchPayout: `0x${string}` }> = {
  5042: {
    usdc: ARC_MAINNET_USDC,
    eurc: ARC_MAINNET_EURC,
    batchPayout: ARC_MAINNET_BATCH_PAYOUT_ADDRESS,
  },
  5042002: {
    usdc: ARC_TESTNET_USDC,
    eurc: ARC_TESTNET_EURC,
    batchPayout: ARC_BATCH_PAYOUT_ADDRESS,
  },
};

export function getActiveNetwork(chainId?: number) {
  return ARC_CONFIG[chainId || 5042] || ARC_CONFIG[5042];
}

const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

export const ARC_BATCH_PAYOUT_ABI = [
  {
    type: 'function',
    name: 'batchPayout',
    inputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      {
        name: 'items',
        type: 'tuple[]',
        internalType: 'struct ArcBatchPayout.PayoutItem[]',
        components: [
          { name: 'recipient', type: 'address', internalType: 'address' },
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
          { name: 'memoId', type: 'bytes32', internalType: 'bytes32' },
        ],
      },
    ],
    outputs: [
      { name: 'batchHash', type: 'bytes32', internalType: 'bytes32' },
      { name: 'nonce', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
] as const;

export interface RawPayoutItem {
  recipient: string;
  amount: number;
  invoiceRef: string;
  token?: string;
}

export interface MultiTxExecutionResult {
  usdcTxHash?: string;
  eurcTxHash?: string;
  primaryTxHash: string;
  gasPaidUsdc: number;
  blockNumber: number;
  totalUsdcPaid: number;
  totalEurcPaid: number;
  wasConverted: boolean;
}

function toRawUnits(amount: number): bigint {
  const str = amount.toFixed(6).replace(/\.?0+$/, '');
  return parseUnits(str === '' ? '0' : str, 6);
}

function formatMemoId(rawMemo: string): `0x${string}` {
  const hex = stringToHex(rawMemo || 'INV-PAYOUT');
  if (hex.length > 66) {
    return hex.slice(0, 66) as `0x${string}`;
  }
  return pad(hex as `0x${string}`, { size: 32, dir: 'right' });
}

export async function checkUserEurcBalance(): Promise<number> {
  const account = getAccount(config);
  if (!account.address) return 0;
  const net = getActiveNetwork(account.chainId);
  try {
    const rawBal = await readContract(config, {
      address: net.eurc,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });
    return Number(formatUnits(rawBal, 6));
  } catch {
    return 0;
  }
}

export async function fetchLiveEurUsdcRate(): Promise<number> {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDC', {
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data.price);
      if (!isNaN(price) && price > 0) return Number(price.toFixed(4));
    }
  } catch {}

  try {
    const res = await fetch('https://v6.exchangerate-api.com/v6/0274a7ca0ebc6b0e21b4b9a4/pair/EUR/USD', {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      const rate = parseFloat(data.conversion_rate);
      if (!isNaN(rate) && rate > 0) return Number(rate.toFixed(4));
    }
  } catch {}

  throw new Error('All live market rate feeds unreachable');
}

async function sendBatchWithApproval(
  tokenAddress: `0x${string}`,
  items: { recipient: string; amount: number; invoiceRef: string }[],
  accountAddress: `0x${string}`,
  onStepChange?: (step: 'approving' | 'settling', tokenName: string) => void,
  tokenName: string = 'USDC'
) {
  if (items.length === 0) return null;

  const account = getAccount(config);
  const net = getActiveNetwork(account.chainId);

  let totalAmountRaw = 0n;
  const formattedItems = items.map((item) => {
    const rawAmt = toRawUnits(item.amount);
    totalAmountRaw += rawAmt;
    return {
      recipient: getAddress(item.recipient.toLowerCase()),
      amount: rawAmt,
      memoId: formatMemoId(item.invoiceRef),
    };
  });

  const currentAllowance = await readContract(config, {
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [accountAddress, net.batchPayout],
  });

  if (currentAllowance < totalAmountRaw) {
    onStepChange?.('approving', tokenName);
    const approveTx = await writeContract(config, {
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [net.batchPayout, maxUint256],
    });
    await waitForTransactionReceipt(config, { hash: approveTx });
  }

  onStepChange?.('settling', tokenName);
  const hash = await writeContract(config, {
    address: net.batchPayout,
    abi: ARC_BATCH_PAYOUT_ABI,
    functionName: 'batchPayout',
    args: [tokenAddress, formattedItems],
  });

  const receipt = await waitForTransactionReceipt(config, { hash });
  return { hash, receipt };
}

export async function executeBatchOnArc(
  items: RawPayoutItem[],
  onProgress?: (stage: 'checking' | 'approving' | 'settling' | 'done', details?: string) => void
): Promise<MultiTxExecutionResult> {
  const account = getAccount(config);
  if (!account.address) throw new Error('Wallet not connected');

  const net = getActiveNetwork(account.chainId);

  onProgress?.('checking', 'Verifying wallet balances and permissions...');

  const usdcItems: { recipient: string; amount: number; invoiceRef: string }[] = [];
  const eurcItems: { recipient: string; amount: number; invoiceRef: string }[] = [];

  let totalEurcNeeded = 0;
  for (const item of items) {
    const isEur = (item.token || '').toUpperCase() === 'EURC' || (item.token || '').toUpperCase() === 'EUR';
    if (isEur) {
      eurcItems.push({ recipient: item.recipient, amount: item.amount, invoiceRef: item.invoiceRef });
      totalEurcNeeded += item.amount;
    } else {
      usdcItems.push({ recipient: item.recipient, amount: item.amount, invoiceRef: item.invoiceRef });
    }
  }

  const userEurcBal = await checkUserEurcBalance();
  const hasEnoughEurc = userEurcBal >= totalEurcNeeded;
  let wasConverted = false;

  if (eurcItems.length > 0 && !hasEnoughEurc) {
    onProgress?.('checking', 'Fetching live EUR/USDC market rate for required conversion...');
    let liveRate: number;
    try {
      liveRate = await fetchLiveEurUsdcRate();
    } catch (err: any) {
      throw new Error(`Treasury halt: Insufficient EURC balance and unable to fetch verified live EUR/USDC rate (${err.message || 'Market offline'}). Payment aborted.`);
    }

    wasConverted = true;
    for (const eItem of eurcItems) {
      const convertedAmount = Number((eItem.amount * liveRate).toFixed(6));
      usdcItems.push({
        recipient: eItem.recipient,
        amount: convertedAmount,
        invoiceRef: `${(eItem.invoiceRef || 'INV').slice(0, 15)} (EUR@${liveRate})`,
      });
    }
    eurcItems.length = 0;
  }

  let eurcTxHash: string | undefined;
  let usdcTxHash: string | undefined;
  let totalGasWei = 0n;
  let lastBlock = 0;

  if (eurcItems.length > 0) {
    const resEur = await sendBatchWithApproval(
      net.eurc,
      eurcItems,
      account.address,
      (step) => onProgress?.(step, step === 'approving' ? 'Authorizing EURC' : 'Executing EURC batch'),
      'EURC'
    );
    if (resEur) {
      eurcTxHash = resEur.hash;
      totalGasWei += resEur.receipt.gasUsed * resEur.receipt.effectiveGasPrice;
      lastBlock = Number(resEur.receipt.blockNumber);
    }
  }

  if (usdcItems.length > 0) {
    const resUsdc = await sendBatchWithApproval(
      net.usdc,
      usdcItems,
      account.address,
      (step) => onProgress?.(step, step === 'approving' ? 'Authorizing USDC' : 'Executing USDC batch'),
      'USDC'
    );
    if (resUsdc) {
      usdcTxHash = resUsdc.hash;
      totalGasWei += resUsdc.receipt.gasUsed * resUsdc.receipt.effectiveGasPrice;
      lastBlock = Number(resUsdc.receipt.blockNumber);
    }
  }

  onProgress?.('done', 'Batch execution completed successfully');

  const totalUsdcPaid = usdcItems.reduce((acc, i) => acc + i.amount, 0);
  const totalEurcPaid = eurcItems.reduce((acc, i) => acc + i.amount, 0);

  return {
    usdcTxHash,
    eurcTxHash,
    primaryTxHash: usdcTxHash || eurcTxHash || '',
    gasPaidUsdc: Number(formatUnits(totalGasWei, 18)),
    blockNumber: lastBlock || 500000,
    totalUsdcPaid,
    totalEurcPaid,
    wasConverted,
  };
}