declare module '@ln-markets/api' {
  export interface RestClient {
    userGet(): Promise<unknown>;
    userDeposit(data: { amount: number; unit: string; memo?: string }): Promise<{
      id: string;
      paymentRequest: string;
      status: string;
      amount: number;
      memo?: string;
    }>;
    userDepositHistory(data?: { limit?: string; from?: string; to?: string }): Promise<{
      id: string;
      status: string;
      amount: number;
      memo?: string;
      createdAt?: number;
    }[]>;
    userWithdraw(data: { amount: number; unit: string; invoice: string }): Promise<unknown>;
    userWithdrawHistory(data?: Record<string, string>): Promise<unknown[]>;
    [key: string]: (...args: unknown[]) => Promise<unknown>;
  }

  export function createRestClient(options?: {
    key?: string;
    secret?: string;
    passphrase?: string;
    network?: 'mainnet' | 'testnet';
    headers?: Record<string, unknown>;
  }): RestClient;

  export function createWebsocketClient(options?: Record<string, unknown>): unknown;
}
