/**
 * LNMarkets REST clients.
 *
 * Two accounts:
 *   Bot client  — existing account, used for trading pool signals (unchanged)
 *   Ops client  — new account, used for subscription invoice generation
 *
 * Usage:
 *   import { getBotClient, getOpsClient } from '@/lib/lnm/client'
 *   const lnm = getOpsClient()
 *   await lnm.userDeposit({ amount: 10000, unit: 'sat', memo: 'SITROOM-GENERAL-...' })
 */

import { createRestClient } from '@ln-markets/api';

function makeClient(key?: string, secret?: string, passphrase?: string) {
  if (!key || !secret || !passphrase) {
    throw new Error('LNMarkets credentials not configured');
  }
  return createRestClient({ key, secret, passphrase, network: 'mainnet' });
}

export function getBotClient() {
  return makeClient(
    process.env.LNM_BOT_KEY,
    process.env.LNM_BOT_SECRET,
    process.env.LNM_BOT_PASSPHRASE,
  );
}

export function getOpsClient() {
  return makeClient(
    process.env.LNM_OPS_KEY,
    process.env.LNM_OPS_SECRET,
    process.env.LNM_OPS_PASSPHRASE,
  );
}

export type LnmClient = import('@ln-markets/api').RestClient;
