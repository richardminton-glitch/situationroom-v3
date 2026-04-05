/**
 * Trading cycle — orchestrates the full AI trading loop.
 *
 * Flow:
 * 1. Assemble data snapshot (market + pool + recent decisions)
 * 2. Call AI engine for structured analysis + decision
 * 3. Log decision to DB
 * 4. Run guardrails validation (risk + mechanical signal overrides)
 * 5. Execute trade if guardrails pass
 * 6. Announce result to bot room
 *
 * No manual approval — auto-executes all guardrail-passing decisions.
 */

import { prisma } from '@/lib/db';
import { assembleSnapshot } from './data-collector';
import { getAIDecision } from './ai-engine';
import { validateDecision } from './guardrails';
import { executeTrade } from './executor';
import {
  announceHold,
  announceScanning,
  announceGuardrailBlock,
  announceAlert,
} from './bot-messages';
import type { AIDecision } from './types';

export async function runTradingCycle(): Promise<{
  success: boolean;
  decision?: string;
  executed?: boolean;
  error?: string;
}> {
  console.log('[trading-cycle] Starting cycle...');

  // ── 1. Assemble snapshot ──
  let snapshot, poolState;
  try {
    const data = await assembleSnapshot();
    snapshot = data.snapshot;
    poolState = data.poolState;
  } catch (err) {
    const msg = `Snapshot assembly failed: ${err}`;
    console.error(`[trading-cycle] ${msg}`);
    await announceAlert('Cycle skipped — failed to assemble market data').catch(() => {});
    return { success: false, error: msg };
  }

  const btcPrice = snapshot.price.current;
  if (!btcPrice || btcPrice <= 0) {
    console.error('[trading-cycle] No BTC price available, skipping cycle');
    return { success: false, error: 'No BTC price' };
  }

  // ── 2. Get AI decision ──
  let aiResult;
  try {
    aiResult = await getAIDecision(snapshot);
  } catch (err) {
    const msg = `AI engine failed: ${err}`;
    console.error(`[trading-cycle] ${msg}`);
    await announceAlert('Cycle skipped — AI engine unavailable').catch(() => {});
    return { success: false, error: msg };
  }

  if (!aiResult) {
    await announceAlert('Cycle skipped — AI returned no decision').catch(() => {});
    return { success: false, error: 'AI returned null' };
  }

  const { decision, raw } = aiResult;
  console.log(`[trading-cycle] AI decision: ${decision.decision} (conv. ${decision.conviction}/10, regime: ${decision.regime})`);

  // ── 3. Log decision to DB ──
  let decisionRecord;
  try {
    decisionRecord = await prisma.tradingDecision.create({
      data: {
        snapshotJson: JSON.stringify(snapshot),
        aiResponseRaw: raw,
        decision: decision.decision,
        conviction: decision.conviction,
        reasoningJson: JSON.stringify({
          regime: decision.regime,
          signals: decision.signals,
          confluence: decision.confluence,
          reasoning: decision.reasoning,
        }),
        tradeJson: decision.trade ? JSON.stringify(decision.trade) : null,
        guardrailPass: false,  // updated below
        chatMessage: decision.chat_message,
        approvalStatus: 'approved',  // auto-approve (no manual approval)
        approvedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[trading-cycle] Failed to log decision:', err);
    return { success: false, error: `DB log failed: ${err}` };
  }

  // ── 4. Handle non-trade decisions ──
  if (decision.decision === 'HOLD') {
    if (poolState.hasPosition && poolState.positionSide) {
      await announceHold(
        poolState.positionSide,
        poolState.leverage,
        poolState.entryPrice ?? 0,
        poolState.unrealisedPnlSats,
        decision.conviction,
        decision.chat_message,
      );
    } else {
      await announceScanning(decision.chat_message);
    }
    await prisma.tradingDecision.update({
      where: { id: decisionRecord.id },
      data: { guardrailPass: true, executed: true },
    });
    return { success: true, decision: 'HOLD', executed: false };
  }

  if (decision.decision === 'FLAT') {
    // If we have a position, close it first
    if (poolState.hasPosition) {
      const closeDecision: AIDecision = { ...decision, decision: 'CLOSE' };
      const closeResult = await executeTrade(closeDecision, poolState, btcPrice, decisionRecord.id);
      if (!closeResult.success) {
        console.error('[trading-cycle] Failed to close position for FLAT:', closeResult.error);
      }
    }
    await announceScanning(decision.chat_message);
    await prisma.tradingDecision.update({
      where: { id: decisionRecord.id },
      data: { guardrailPass: true, executed: true },
    });
    return { success: true, decision: 'FLAT', executed: poolState.hasPosition };
  }

  // ── 5. Guardrails check ──
  const openTradeCount = poolState.hasPosition ? 1 : 0;
  const guardrail = validateDecision(decision, poolState, btcPrice, openTradeCount);

  await prisma.tradingDecision.update({
    where: { id: decisionRecord.id },
    data: {
      guardrailPass: guardrail.pass,
      guardrailReason: guardrail.reason ?? null,
    },
  });

  if (!guardrail.pass) {
    console.log(`[trading-cycle] Guardrail blocked: ${guardrail.reason}`);
    await announceGuardrailBlock(decision.decision, guardrail.reason!);
    return { success: true, decision: decision.decision, executed: false };
  }

  // ── 6. Execute ──
  const execResult = await executeTrade(decision, poolState, btcPrice, decisionRecord.id);

  if (!execResult.success) {
    console.error(`[trading-cycle] Execution failed: ${execResult.error}`);
    await announceAlert(`Trade execution failed: ${execResult.error}`).catch(() => {});
    return { success: false, decision: decision.decision, executed: false, error: execResult.error };
  }

  console.log(`[trading-cycle] Cycle complete: ${decision.decision} executed successfully`);
  return { success: true, decision: decision.decision, executed: true };
}
