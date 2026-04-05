/**
 * Trading engine — public API.
 *
 * Phase 1: Bot room message utilities + data foundation ✓
 * Phase 2: AI engine, guardrails, executor ✓
 * Phase 3: Cron-based trading cycle + position sync ✓
 */

// Bot room announcements
export { postBotRoomMessage, announceTradeOpen, announceTradeClose, announceHold, announceScanning, announceExternalClose, announceGuardrailBlock, announceAlert } from './bot-messages';

// Types
export type { AIDecision, TradingSnapshot, PoolState, ExecutionResult, GuardrailResult, SignalScore, MarketRegime, TradeDecision } from './types';

// Data collection
export { assembleSnapshot, fetchPoolState, formatSnapshotPrompt } from './data-collector';

// AI engine
export { getAIDecision } from './ai-engine';

// Risk management
export { validateDecision } from './guardrails';

// Trade execution
export { executeTrade } from './executor';

// Position sync
export { syncPositions } from './position-sync';

// Trading cycle
export { runTradingCycle } from './cycle';
