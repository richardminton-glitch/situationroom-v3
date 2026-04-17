export interface ConfirmedBlock {
  id: string;
  height: number;
  timestamp: number;
  tx_count: number;
  size: number;
  weight: number;
  extras?: {
    reward?: number;
    totalFees?: number;
    medianFee?: number;
    feeRange?: number[];
    avgFee?: number;
    avgFeeRate?: number;
    pool?: { id: number; name: string; slug: string };
  };
}

export interface PendingBlock {
  blockSize: number;
  blockVSize: number;
  nTx: number;
  totalFees: number;
  medianFee: number;
  feeRange: number[];
}

export type StripBlock =
  | { kind: 'confirmed'; data: ConfirmedBlock; isTip: boolean }
  | { kind: 'pending';   data: PendingBlock; minutesAway: number; index: number };
