/**
 * POST /api/admin/update-ism
 *
 * Admin-only: append or replace a single ISM Manufacturing PMI reading.
 * Body: { month: "YYYY-MM", value: number, note?: string }
 *
 * The Macro Cycle room reads from /api/data/ism-cycle which in turn reads
 * the JSON file this route writes to. ISM publishes the headline number on
 * the first business day of each month — the workflow is for an admin to
 * paste it in shortly after release.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/tier';
import { readIsmCycle, writeIsmCycle, upsertReading } from '@/lib/macro-cycle/storage';
import type { IsmReading } from '@/lib/macro-cycle/types';

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  let body: { month?: string; value?: number; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { month, value, note } = body;

  if (!month || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 400 });
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 20 || value > 80) {
    return NextResponse.json({ error: 'value must be a number between 20 and 80' }, { status: 400 });
  }

  const reading: IsmReading = {
    month,
    value: Math.round(value * 10) / 10,
    ...(note ? { note: note.slice(0, 200) } : {}),
  };

  const current = readIsmCycle();
  const updated = upsertReading(current, reading);

  try {
    writeIsmCycle(updated);
  } catch (err) {
    console.error('[admin/update-ism] write failed:', err);
    return NextResponse.json({ error: 'Failed to persist reading' }, { status: 500 });
  }

  return NextResponse.json({ success: true, reading, total: updated.readings.length });
}
