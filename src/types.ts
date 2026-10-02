export interface PayoutRecord {
  id: string;
  rowNumber: number;
  recipientName: string;
  walletAddress: string;
  amount: number;
  token: 'USDC' | 'EURC' | string;
  invoiceRef: string;
  rawAmountString?: string;
  status: 'valid' | 'warning' | 'error';
  validationErrors: string[];
}

export interface BatchSummary {
  totalRecords: number;
  validRecords: number;
  errorRecords: number;
  totalUsdc: number;
  totalEurc: number;
  userEurcBalance: number;
  willAutoConvertEur: boolean;
  eurRate: number;
  rateSource: string;
  estimatedGasLabel: string;
  estimatedGasUsdc: number;
  hasFatalErrors: boolean;
}

export interface ExecutionReceipt {
  usdcTxHash?: string;
  eurcTxHash?: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  network: string;
  totalUsdcPaid: number;
  totalEurcPaid: number;
  wasConverted: boolean;
  gasPaidUsdc: number;
  records: PayoutRecord[];
}