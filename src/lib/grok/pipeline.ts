/**
 * Briefing generation pipeline — orchestrates the 5-agent Grok architecture.
 * Agents 1–4 run in parallel, Agent 5 synthesizes sequentially.
 */

import { callGrokAgent } from './client';
import { buildAgentPrompts, type DashboardSnapshot } from './prompts';
import { stripBannedPhrases, extractHeadline, checkBannedPhrases } from './quality';
import { prisma } from '@/lib/db';
import type { RSSHeadline } from '@/lib/data/rss';

export interface BriefingResult {
  date: string;
  headline: string;
  sections: {
    market: string;
    network: string;
    geopolitical: string;
    macro: string;
    outlook: string;
  };
  sources: { url: string; title: string }[];
  threatLevel: string;
  convictionScore: number;
  dataSnapshot: DashboardSnapshot;
  generatedAt: string;
  quality: {
    bannedPhraseViolations: string[];
    agentsFailed: string[];
  };
}

export async function generateBriefing(snapshot: DashboardSnapshot, headlines?: RSSHeadline[]): Promise<BriefingResult> {
  const today = new Date().toISOString().split('T')[0];
  const prompts = buildAgentPrompts(snapshot);

  console.log(`[Briefing] Starting generation for ${today}`);
  const startTime = Date.now();

  // Phase 1: Agents 1–4 in parallel
  console.log('[Briefing] Phase 1: Running agents 1–4 in parallel...');
  const [marketRes, networkRes, geopoliticalRes, macroRes] = await Promise.all([
    callGrokAgent(prompts.market),
    callGrokAgent(prompts.network),
    callGrokAgent(prompts.geopolitical),
    callGrokAgent(prompts.macro),
  ]);

  const agentsFailed: string[] = [];
  if (marketRes.failed) agentsFailed.push('market');
  if (networkRes.failed) agentsFailed.push('network');
  if (geopoliticalRes.failed) agentsFailed.push('geopolitical');
  if (macroRes.failed) agentsFailed.push('macro');

  if (agentsFailed.length > 0) {
    console.warn(`[Briefing] Agents failed: ${agentsFailed.join(', ')}`);
  }

  // Phase 2: Agent 5 synthesizes
  console.log('[Briefing] Phase 2: Running synthesis agent...');
  const outlookPrompt = prompts.buildOutlook(
    marketRes.content || '[Market section unavailable]',
    networkRes.content || '[Network section unavailable]',
    geopoliticalRes.content || '[Geopolitical section unavailable]',
    macroRes.content || '[Macro section unavailable]'
  );
  const outlookRes = await callGrokAgent(outlookPrompt);
  if (outlookRes.failed) agentsFailed.push('outlook');

  // Phase 3: Post-processing
  console.log('[Briefing] Phase 3: Post-processing...');

  // Strip banned phrases from all sections
  const sections = {
    market: stripBannedPhrases(marketRes.content),
    network: stripBannedPhrases(networkRes.content),
    geopolitical: stripBannedPhrases(geopoliticalRes.content),
    macro: stripBannedPhrases(macroRes.content),
    outlook: '',
  };

  // Extract headline from outlook
  const { headline, cleanContent } = extractHeadline(stripBannedPhrases(outlookRes.content));
  sections.outlook = cleanContent;

  // Check for any remaining banned phrases
  const allText = Object.values(sections).join(' ');
  const bannedPhraseViolations = checkBannedPhrases(allText);

  // Collect all sources
  const allSources = [
    ...marketRes.sources,
    ...networkRes.sources,
    ...geopoliticalRes.sources,
    ...macroRes.sources,
    ...outlookRes.sources,
  ];
  const uniqueSources = Array.from(
    new Map(allSources.map((s) => [s.url, s])).values()
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Briefing] Generated in ${elapsed}s — ${uniqueSources.length} unique sources, headline: "${headline}"`);

  // Phase 4: Store in database
  const generatedAt = new Date().toISOString();

  try {
    const briefingData = {
      generatedAt: new Date(generatedAt),
      marketSection: sections.market,
      networkSection: sections.network,
      geopoliticalSection: sections.geopolitical,
      macroSection: sections.macro,
      outlookSection: sections.outlook,
      dataSnapshotJson: JSON.stringify(snapshot),
      sourcesJson: JSON.stringify(uniqueSources),
      headlinesJson: JSON.stringify((headlines || []).slice(0, 50)),
      threatLevel: snapshot.threatLevel,
      convictionScore: snapshot.convictionScore,
      headline,
    };

    await prisma.briefing.upsert({
      where: { date: new Date(today) },
      update: briefingData,
      create: { date: new Date(today), ...briefingData },
    });
    console.log(`[Briefing] Stored briefing for ${today}`);
  } catch (error) {
    console.error('[Briefing] Database storage failed:', error);
  }

  return {
    date: today,
    headline,
    sections,
    sources: uniqueSources,
    threatLevel: snapshot.threatLevel,
    convictionScore: snapshot.convictionScore,
    dataSnapshot: snapshot,
    generatedAt,
    quality: { bannedPhraseViolations, agentsFailed },
  };
}
