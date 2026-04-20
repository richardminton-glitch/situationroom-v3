// One-off test send of the proposed combined welcome + PIN email.
// Does NOT modify the production flow. Run on the VPS where
// RESEND_API_KEY is set in .env.local.
//
//   cd /opt/situationroom-v3 && node --env-file=.env.local scripts/test-welcome-email.js

const { Resend } = require('resend');

const TO           = 'richardminton@gmail.com';
const FROM         = 'Situation Room <situationroom@rdctd.co.uk>';
const SITE         = 'https://situationroom.space';
const SAMPLE_PIN   = '482956'; // placeholder for preview only

const C = {
  bg:        '#f5f0e8',
  card:      '#ede8dc',
  border:    '#c8b89a',
  text:      '#2c2416',
  muted:     '#8b7355',
  accent:    '#8b6914',
  dimBorder: '#d4c9b4',
};

const serif = 'Georgia, "Times New Roman", Times, serif';
const mono  = '"Courier New", Courier, monospace';

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Welcome to Situation Room</title>
</head>
<body style="background-color:${C.bg};margin:0;padding:0;font-family:${serif}">
  <div style="max-width:600px;margin:0 auto;padding:20px 0">

    <!-- Header -->
    <div style="background-color:${C.card};border:1px solid ${C.border};padding:24px 28px 16px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 12px">
        <tr>
          <td style="vertical-align:middle;padding-right:14px">
            <img src="${SITE}/icons/icon-192.png" width="48" height="48" alt="Situation Room" style="display:block;border:1px solid ${C.border};border-radius:6px">
          </td>
          <td style="vertical-align:middle">
            <div style="font-family:${mono};font-size:10px;letter-spacing:0.18em;color:${C.muted};margin:0 0 4px">SITUATION ROOM</div>
            <div style="font-family:${mono};font-size:10px;letter-spacing:0.14em;color:${C.muted};margin:0">BITCOIN &amp; GLOBAL MACRO INTELLIGENCE</div>
          </td>
        </tr>
      </table>
      <div style="font-family:${serif};font-size:22px;color:${C.text};margin:0;letter-spacing:0.02em">Welcome aboard.</div>
    </div>

    <!-- Intro + PIN -->
    <div style="background-color:${C.card};border-left:1px solid ${C.border};border-right:1px solid ${C.border};padding:12px 28px 4px">
      <hr style="border:none;border-top:1px solid ${C.dimBorder};margin:0 0 16px">
      <p style="font-family:${serif};font-size:14px;color:${C.text};line-height:1.7;margin:0 0 18px">
        You&rsquo;re now set up on Situation Room &mdash; a dashboard and briefing service tracking
        Bitcoin, global macro, and geopolitical signal in one place.
      </p>

      <div style="font-family:${mono};font-size:10px;letter-spacing:0.16em;color:${C.muted};margin:0 0 8px">YOUR SIGN-IN PIN</div>
      <div style="font-family:${mono};font-size:36px;letter-spacing:0.5em;font-weight:bold;text-align:center;padding:18px;background:#fff;border:1px solid ${C.border};color:${C.text};margin:0 0 10px">
        ${SAMPLE_PIN}
      </div>
      <p style="font-family:${serif};font-size:13px;color:${C.muted};line-height:1.6;margin:0 0 18px">
        This PIN is permanent. It stays the same every time you sign in &mdash; keep it somewhere safe.
      </p>
    </div>

    <!-- Newsletter policy -->
    <div style="background-color:${C.card};border-left:1px solid ${C.border};border-right:1px solid ${C.border};padding:0 28px 20px">
      <hr style="border:none;border-top:1px solid ${C.dimBorder};margin:0 0 16px">
      <div style="font-family:${mono};font-size:10px;letter-spacing:0.18em;color:${C.muted};margin:0 0 10px">YOUR NEWSLETTER SUBSCRIPTION</div>
      <p style="font-family:${serif};font-size:14px;color:${C.text};line-height:1.7;margin:0 0 12px">
        By registering, you&rsquo;ve agreed to receive our <strong>weekly digest</strong>, delivered every
        Sunday at 06:15 UTC. It&rsquo;s a short summary of the week&rsquo;s briefings and the current state
        of the market &mdash; free for every tier.
      </p>
      <p style="font-family:${serif};font-size:14px;color:${C.text};line-height:1.7;margin:0 0 12px">
        You can also opt into the <strong>daily briefing email</strong> &mdash; the full five-section analysis
        delivered at 06:15 UTC, Monday through Saturday &mdash; from your Account page. On Sundays,
        the weekly digest replaces the daily briefing so you only get one email that day.
      </p>
      <p style="font-family:${serif};font-size:14px;color:${C.text};line-height:1.7;margin:0 0 18px">
        If you&rsquo;d rather not receive email at all, you can opt out from the same page. Your
        preferences take effect immediately &mdash; no confirmation click required.
      </p>

      <div style="text-align:center;margin:6px 0 4px">
        <a href="${SITE}/account"
           style="display:inline-block;padding:12px 32px;background-color:${C.accent};color:${C.bg};font-family:${mono};font-size:12px;letter-spacing:0.14em;font-weight:bold;text-decoration:none">
          MANAGE PREFERENCES
        </a>
      </div>
    </div>

    <div style="background-color:${C.card};border-left:1px solid ${C.border};border-right:1px solid ${C.border};border-bottom:1px solid ${C.border};padding:0 28px 20px">
      <hr style="border:none;border-top:1px solid ${C.dimBorder};margin:0">
    </div>

    <!-- Outer footer -->
    <div style="padding:16px 28px;text-align:center">
      <div style="font-family:${mono};font-size:10px;color:${C.muted}">
        Situation Room &nbsp;&middot;&nbsp;
        <a href="${SITE}" style="color:${C.muted};text-decoration:underline">situationroom.space</a>
        &nbsp;&middot;&nbsp;
        <a href="${SITE}/account" style="color:${C.muted};text-decoration:underline">Opt out</a>
      </div>
    </div>

  </div>
</body>
</html>
`;

(async () => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const res = await resend.emails.send({
    from: FROM,
    to: TO,
    subject: '[TEST] Welcome to Situation Room — Your Sign-In PIN',
    html,
  });
  console.log(JSON.stringify(res, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
