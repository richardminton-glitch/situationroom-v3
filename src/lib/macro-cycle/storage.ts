/**
 * Macro Cycle Room — disk storage helpers.
 *
 * Manual ISM PMI values live in /data/ism-cycle.json (gitignored, written
 * by the admin POST endpoint). If the file is missing the read helper
 * returns the empty seed so the page can render an empty-state.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { IsmCycleData, IsmReading } from './types';
import { SEED_READINGS } from './seedReadings';

const STORAGE_FILE = join(process.cwd(), 'data', 'ism-cycle.json');

/** Default dataset used when no runtime file is present — historical seed. */
const HISTORICAL_SEED: IsmCycleData = {
  readings: SEED_READINGS,
  updatedAt: null,
  seed: true,
};

/** Read the persisted dataset, or fall back to the historical seed. */
export function readIsmCycle(): IsmCycleData {
  try {
    const raw = readFileSync(STORAGE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as IsmCycleData;
    return {
      readings: Array.isArray(parsed.readings) ? parsed.readings : [],
      updatedAt: parsed.updatedAt ?? null,
      seed: false,
    };
  } catch {
    return HISTORICAL_SEED;
  }
}

/** Write the dataset to disk. Throws on filesystem error. */
export function writeIsmCycle(data: IsmCycleData): void {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
}

/**
 * Insert or replace a reading for the given month. Returns the updated
 * dataset, sorted oldest → newest by month.
 */
export function upsertReading(current: IsmCycleData, reading: IsmReading): IsmCycleData {
  const filtered = current.readings.filter((r) => r.month !== reading.month);
  const next = [...filtered, reading].sort((a, b) => a.month.localeCompare(b.month));
  return {
    readings: next,
    updatedAt: new Date().toISOString(),
    seed: false,
  };
}
