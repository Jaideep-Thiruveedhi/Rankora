# Rankora Apply Agent — browser extension (V1, demonstration milestone)

A Manifest V3 Chrome extension that pairs with the Rankora Apply dashboard and
fills examination application forms **only after you review and approve the
plan**. It never submits, never pays, and never touches passwords, OTPs,
CAPTCHAs, payments or file uploads.

> This V1 build is a local demonstration. It has **not** been validated
> against any official examination portal yet.

## What it does

1. Pairs with your Rankora workspace using a one-time 15-minute code shown on
   `/apply/agent` — the httpOnly Rankora cookie never becomes visible to this
   extension; pairing only yields a short-lived, workspace-scoped agent
   session that the server can revoke.
2. On your request ("Inspect this page"), reads **metadata** of visible form
   fields — labels, input kinds, required flags, dropdown/radio options. It
   never reads what you typed into any field.
3. Sends those labels to the Rankora server, which maps them to your saved
   profile fields with deterministic rules (a locally-configured Ollama model
   is consulted only for labels the rules cannot classify — labels/option
   text only, never your actual answers).
4. Shows you the proposed fill plan. You check the fields you approve
   (model-suggested mappings start unchecked) and press **Fill approved
   fields**. Nothing is filled without that explicit click.
5. Reports every field it could not fill and why (no saved value, no matching
   dropdown option, page changed, refused for safety …).
6. Stops there. Submission, payment, CAPTCHA and OTP steps stay yours.

## Install (unpacked, Chrome / Edge)

1. Start the Rankora server (from the repo root):

   ```
   npm run dev
   ```

   and open `http://localhost:3000/apply/agent`.

2. Open `chrome://extensions` in Chrome (or `edge://extensions` in Edge).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the folder
   `extensions/rankora-apply-agent` (the folder containing `manifest.json`).
5. Pin the "Rankora Apply Agent" icon from the extensions (puzzle) menu.

## First run

1. On `/apply/agent`, press **Generate pairing code** (valid 15 minutes,
   single use). Each new connection needs a fresh code.
2. Click the extension icon, paste the code (e.g. `ABCDE-FGHJK-MNPQR`),
   press **Pair**. The popup shows "Connected" with a countdown (30-minute
   session; you can revoke it any time with "Cancel agent connection" on the
   Rankora page or "Disconnect here" in the popup).
3. Try the safe demonstration form at
   `http://localhost:3000/apply/agent/demo-form` — press **Inspect this
   page**, review the plan (including the deliberately ambiguous and unsafe
   probes), approve fields, press **Fill approved fields**.

## Where the extension works

- Always on `http://localhost` / `http://127.0.0.1` (declared host
  permissions; used for the demo and for talking to the Rankora server).
- On any other site via Chrome's `activeTab`: access starts only when you
  click the extension popup on that tab. The extension holds no global
  "read every website" permission.

If you host Rankora somewhere else than `http://localhost:3000`, change
`RANKORA_BASE` at the top of `background.js`.

## Files

- `manifest.json` — MV3 manifest (permissions: `storage`, `activeTab`,
  `scripting`; host permissions limited to localhost).
- `background.js` — service worker: pairing, detection→mapping calls,
  value fetches, fill orchestration. Stores only the agent session token in
  `chrome.storage.local`.
- `popup.html` / `popup.css` / `popup.js` — the control surface: pairing,
  plan review, approve-fill, results. Page-derived text is rendered with
  `textContent` only.
- `content/agent.js` — in-page scanner/filler. Refuses password inputs,
  OTP/CAPTCHA/payment/Aadhaar/upload fields, dispatches `input`/`change`
  events after setting values via native prototypes, and never submits.

## Safety posture (V1)

- Single-use pairing code, expiring agent session, revocable from both sides.
- The extension can only list/fill fields the server's canonical allowlist
  accepts; model output is validated against the same allowlist.
- Attacker-influenced page labels cannot trigger a fill by themselves: fill
  requires the workspace-specific session **and** an explicit click in the
  popup, and every fill re-verifies each field's identity in the page.
- No CAPTCHA/OTP bypass, no payment automation, no submission, no uploads.
