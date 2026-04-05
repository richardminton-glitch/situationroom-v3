/**
 * Trading engine — public API.
 *
 * Phase 1: Bot room message utilities + data foundation
 * Phase 2: AI engine, guardrails, executor (TODO)
 * Phase 3: Cron-based trading cycle + position sync (TODO)
 */

export { postBotRoomMessage, announceTradeOpen, announceTradeClose, announceHold, announceScanning, announceExternalClose, announceGuardrailBlock, announceAlert } from './bot-messages';
