/**
 * Macro Cycle Room — historical ISM Manufacturing PMI seed.
 *
 * 60 monthly readings from Apr 2021 through Mar 2026, sourced from the
 * official ISM Report On Business releases (PR Newswire archive) and
 * cross-checked against YCharts. Values reflect the originally published
 * headline PMI; ISM occasionally revises these by ±0.1 in subsequent
 * months — close enough for cycle-phase visualisation.
 *
 * Used by storage.readIsmCycle() as the fallback when no runtime
 * /data/ism-cycle.json exists. Once an admin POSTs a new reading, the
 * full series is materialised into the runtime file and this seed is no
 * longer consulted (the runtime file becomes source of truth).
 */

import type { IsmReading } from './types';

export const SEED_READINGS: IsmReading[] = [
  // 2021
  { month: '2021-04', value: 60.7 },
  { month: '2021-05', value: 61.2 },
  { month: '2021-06', value: 60.6 },
  { month: '2021-07', value: 59.5 },
  { month: '2021-08', value: 59.9 },
  { month: '2021-09', value: 61.1 },
  { month: '2021-10', value: 60.8 },
  { month: '2021-11', value: 61.1 },
  { month: '2021-12', value: 58.7 },
  // 2022
  { month: '2022-01', value: 57.6 },
  { month: '2022-02', value: 58.6 },
  { month: '2022-03', value: 57.1 },
  { month: '2022-04', value: 55.4 },
  { month: '2022-05', value: 56.1 },
  { month: '2022-06', value: 53.0 },
  { month: '2022-07', value: 52.8 },
  { month: '2022-08', value: 52.8 },
  { month: '2022-09', value: 50.9 },
  { month: '2022-10', value: 50.2 },
  { month: '2022-11', value: 49.0 },
  { month: '2022-12', value: 48.4 },
  // 2023
  { month: '2023-01', value: 47.4 },
  { month: '2023-02', value: 47.7 },
  { month: '2023-03', value: 46.3 },
  { month: '2023-04', value: 47.1 },
  { month: '2023-05', value: 46.9 },
  { month: '2023-06', value: 46.0 },
  { month: '2023-07', value: 46.4 },
  { month: '2023-08', value: 47.6 },
  { month: '2023-09', value: 49.0 },
  { month: '2023-10', value: 46.7 },
  { month: '2023-11', value: 46.7 },
  { month: '2023-12', value: 47.1 },
  // 2024
  { month: '2024-01', value: 49.1 },
  { month: '2024-02', value: 47.8 },
  { month: '2024-03', value: 50.3 },
  { month: '2024-04', value: 49.2 },
  { month: '2024-05', value: 48.7 },
  { month: '2024-06', value: 48.5 },
  { month: '2024-07', value: 46.8 },
  { month: '2024-08', value: 47.2 },
  { month: '2024-09', value: 47.2 },
  { month: '2024-10', value: 46.5 },
  { month: '2024-11', value: 48.4 },
  { month: '2024-12', value: 49.2 },
  // 2025
  { month: '2025-01', value: 50.9 },
  { month: '2025-02', value: 50.3 },
  { month: '2025-03', value: 49.0 },
  { month: '2025-04', value: 48.7 },
  { month: '2025-05', value: 48.5 },
  { month: '2025-06', value: 49.0 },
  { month: '2025-07', value: 48.0 },
  { month: '2025-08', value: 48.7 },
  { month: '2025-09', value: 49.1 },
  { month: '2025-10', value: 48.7 },
  { month: '2025-11', value: 48.2 },
  { month: '2025-12', value: 47.9 },
  // 2026
  { month: '2026-01', value: 52.6 },
  { month: '2026-02', value: 52.4 },
  { month: '2026-03', value: 52.7 },
];
