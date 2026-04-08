/**
 * POST /api/feedback
 *
 * Authenticated-only. Sends a plain-HTML email to rich@rdctd.co.uk containing
 * the user's email, tier, user id, topic, and issue text.
 *
 * Body: { topic: string, issue: string }
 *
 * No database write — this is fire-and-forget via Resend. If Resend fails, we
 * return a 502 so the modal can surface the error and the user can retry.
 *
 * Basic abuse guard: per-user in-memory throttle of one submission every 30s.
 * Deliberately not Prisma-backed — at 51 users this is overkill to persist,
 * and the throttle resets on PM2 restart which is fine.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getResend, FROM_ADDRESS } from '@/lib/newsletter/resend';

const FEEDBACK_INBOX = 'rich@rdctd.co.uk';

const MAX_TOPIC_LEN = 120;
const MAX_ISSUE_LEN = 5000;
const THROTTLE_MS = 30 * 1000;

// In-memory throttle: userId → last-submission timestamp (ms epoch).
// Per-process, so each cluster worker has its own map. That's fine for a
// 30-second anti-double-click guard — it's not a security control.
const lastSubmit = new Map<string, number>();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Throttle ──────────────────────────────────────────────────────────────
  const now = Date.now();
  const last = lastSubmit.get(user.id) ?? 0;
  if (now - last < THROTTLE_MS) {
    const retryIn = Math.ceil((THROTTLE_MS - (now - last)) / 1000);
    return NextResponse.json(
      { error: `Please wait ${retryIn}s before submitting again` },
      { status: 429 },
    );
  }

  // ── Parse + validate body ────────────────────────────────────────────────
  let body: { topic?: unknown; issue?: unknown };
  try { body = await request.json(); } catch { body = {}; }

  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  const issue = typeof body.issue === 'string' ? body.issue.trim() : '';

  if (!topic) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  }
  if (topic.length > MAX_TOPIC_LEN) {
    return NextResponse.json({ error: `topic must be ≤ ${MAX_TOPIC_LEN} chars` }, { status: 400 });
  }
  if (!issue) {
    return NextResponse.json({ error: 'issue is required' }, { status: 400 });
  }
  if (issue.length > MAX_ISSUE_LEN) {
    return NextResponse.json({ error: `issue must be ≤ ${MAX_ISSUE_LEN} chars` }, { status: 400 });
  }

  // ── Render email ─────────────────────────────────────────────────────────
  // Plain HTML — no react-email template needed for an internal inbox.
  const topicHtml = escapeHtml(topic);
  // Preserve line breaks in the issue text
  const issueHtml = escapeHtml(issue).replace(/\n/g, '<br>');
  const submittedAt = new Date().toISOString();

  const subject = `[Situation Room feedback] ${topic.slice(0, 80)}`;

  const html = `<!DOCTYPE html>
<html><body style="font-family: Georgia, 'Times New Roman', Times, serif; background: #f5f0e8; color: #2c2416; margin: 0; padding: 20px;">
  <table style="max-width: 600px; margin: 0 auto; border-collapse: collapse; background: #ede8dc; border: 1px solid #c8b89a;">
    <tr><td style="padding: 20px 24px 8px 24px;">
      <div style="font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.18em; color: #8b7355;">
        SITUATION ROOM &middot; USER FEEDBACK
      </div>
      <div style="font-size: 18px; color: #2c2416; margin-top: 6px; letter-spacing: 0.02em;">
        ${topicHtml}
      </div>
    </td></tr>
    <tr><td style="padding: 12px 24px; border-top: 1px solid #d4c9b4;">
      <div style="font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.12em; color: #8b7355; margin-bottom: 10px;">
        FROM
      </div>
      <div style="font-size: 14px; color: #2c2416; line-height: 1.6;">
        <strong>${escapeHtml(user.email)}</strong><br>
        <span style="color: #8b7355; font-size: 12px;">
          tier: ${escapeHtml(user.tier)} &middot; user id: ${escapeHtml(user.id)}<br>
          submitted: ${submittedAt}
        </span>
      </div>
    </td></tr>
    <tr><td style="padding: 12px 24px 24px 24px; border-top: 1px solid #d4c9b4;">
      <div style="font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.12em; color: #8b7355; margin-bottom: 10px;">
        MESSAGE
      </div>
      <div style="font-size: 14px; color: #2c2416; line-height: 1.7; white-space: pre-wrap;">
        ${issueHtml}
      </div>
    </td></tr>
  </table>
</body></html>`;

  // ── Send ──────────────────────────────────────────────────────────────────
  try {
    const resend = getResend();
    await resend.emails.send({
      from:     FROM_ADDRESS,
      to:       FEEDBACK_INBOX,
      replyTo:  user.email,
      subject,
      html,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[feedback] send failed:', err);
    return NextResponse.json({ error: `send failed: ${msg}` }, { status: 502 });
  }

  // Only mark throttle on successful send, so failures are retryable.
  lastSubmit.set(user.id, now);

  return NextResponse.json({ sent: true });
}
