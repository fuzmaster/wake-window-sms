# Wake Window SMS Bot MVP

A ruthless, low-friction MVP for testing whether exhausted parents will repeatedly use SMS for nap timing.

The parent texts:

```txt
UP
```

The bot replies:

```txt
Next nap target: 9:15 AM.
Start winding down: 9:00 AM.
Based on 3–4 months wake window (90-120 min).
Not medical advice. Use your pediatrician for health concerns.
```

## What this includes

- Twilio-compatible SMS webhook at `POST /sms/twilio`
- Local browser test endpoint at `POST /api/test-sms`
- Lightweight JSON key-value store for phone number state
- Baby age storage
- Timezone storage
- `UP`, `DOWN`, `AGE`, `TZ`, `STATUS`, `HELP`, `RESET` commands
- Wake-window calculator by baby age
- Short-nap adjustment when `DOWN` then `UP` are used
- Vite landing/test page

## What this intentionally does not include yet

- Login system
- Subscription billing
- Scheduled reminder texts
- Parent dashboard
- Medical triage
- AI cry detection

Do not add those until real parents prove they keep using the core SMS loop.

## Folder structure

```txt
wake-window-sms-bot/
  server/
    index.js          Express server + Twilio webhook
    bot.js            SMS command handling
    parser.js         Time and command parsing
    store.js          JSON state store
    wakeWindows.js    Wake-window table + adjustment logic
  src/
    main.jsx          Vite landing/test UI
    styles.css
  data/
    .gitkeep          Runtime store will appear here as store.json
  test/
    parser.test.js
    wakeWindows.test.js
  .env.example
  package.json
  README.md
```

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

This runs:

- Express API at `http://localhost:3000`
- Vite landing page at `http://localhost:5173`

Open:

```txt
http://localhost:5173
```

Use the local test console to simulate texts.

Note: `data/store.json` is local runtime state for development/testing and should never be committed.

## Local SMS simulation with curl

```bash
curl -X POST http://localhost:3000/api/test-sms \
  -H "Content-Type: application/json" \
  -d '{"from":"+15555550123","body":"AGE 13 WEEKS"}'
```

```bash
curl -X POST http://localhost:3000/api/test-sms \
  -H "Content-Type: application/json" \
  -d '{"from":"+15555550123","body":"UP"}'
```

## Twilio + ngrok Testing

Use this flow to test real inbound SMS from Twilio against your local Express server.

### 1) Start the app (PowerShell)

```powershell
npm run dev
```

Keep this terminal open. This runs:

- Express backend on `http://localhost:3000`
- Vite frontend on `http://localhost:5173`

### 2) Start ngrok in a second PowerShell terminal

```powershell
ngrok http 3000
```

### 3) Find the Forwarding HTTPS URL

Option A (from ngrok terminal):

- Copy the `Forwarding` URL that starts with `https://` and ends with `.ngrok-free.app`

Option B (PowerShell command):

```powershell
$tunnel = Invoke-RestMethod http://127.0.0.1:4040/api/tunnels
$httpsUrl = ($tunnel.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1 -ExpandProperty public_url)
$httpsUrl
```

### 4) Build the final Twilio webhook URL

Append `/sms/twilio` to the HTTPS forwarding URL.

```powershell
$webhookUrl = "$httpsUrl/sms/twilio"
$webhookUrl
```

Expected format:

```txt
https://YOUR-NGROK-URL.ngrok-free.app/sms/twilio
```

### 5) Set Twilio number webhook

In Twilio Console for your SMS number, under Messaging:

- A message comes in: `Webhook`
- Method: `HTTP POST`
- URL: `https://YOUR-NGROK-URL.ngrok-free.app/sms/twilio`

Save the number settings.

### 6) Test SMS commands

Send these to your Twilio number:

```txt
AGE 13 WEEKS
UP
UP 7:15
DOWN
STATUS
HELP
```

## Troubleshooting (ngrok + Twilio local)

- `ngrok` command not found:
  - Install ngrok and reopen PowerShell so PATH updates.
  - Verify with: `ngrok version`
- ngrok authentication required:
  - Sign in to ngrok and add auth once in your terminal profile:
  - `ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN`
  - Do not put this token in project files, code, `.env.example`, or commits.
- Wrong local port:
  - Use `ngrok http 3000` because Express listens on 3000 in this project.
  - Do not tunnel port 80 for local testing here.
- App and ngrok not running together:
  - Keep `npm run dev` running in one terminal and `ngrok http 3000` in a second terminal at the same time.
- Twilio method mismatch:
  - Ensure Twilio is set to `HTTP POST` for `A message comes in`.
  - The webhook route is `POST /sms/twilio`; GET will fail.

## Twilio setup (production)

1. Buy or use a Twilio SMS-capable number.
2. Deploy this app somewhere public, such as Railway, Render, or a VPS.
3. In Twilio Console, open your phone number.
4. Under Messaging, set the webhook URL to:

```txt
https://YOUR_PUBLIC_URL/sms/twilio
```

5. Set method to `POST`.
6. Text your Twilio number:

```txt
AGE 13 WEEKS
```

Then:

```txt
UP
```

## SMS commands

### Save baby age

```txt
AGE 13 WEEKS
```

or

```txt
AGE 4 MONTHS
```

### Save timezone

```txt
TZ America/New_York
```

### Log wake time as now

```txt
UP
```

### Override wake time

```txt
UP 7:15
UP 715
UP 7:15am
```

### Log sleep start

```txt
DOWN
```

or

```txt
DOWN 9:15
```

### Check saved profile

```txt
STATUS
```

### See commands

```txt
HELP
```

### Delete saved info

```txt
RESET
```

## Wake-window table

| Age | Wake window |
|---|---:|
| 0–4 weeks | 45–60 min |
| 1–2 months | 60–90 min |
| 2–3 months | 75–100 min |
| 3–4 months | 90–120 min |
| 5–6 months | 120–180 min |
| 6–9 months | 150–210 min |
| 9–12 months | 180–240 min |

The MVP uses the midpoint. If the previous nap was under 45 minutes, it shortens the next window by 15%.

## Validation test

Give the number to 5 parents.

Ask them to use it for 2 days:

```txt
Text AGE [baby age] once.
Text UP every time baby wakes.
Optional: text DOWN when baby falls asleep.
```

Do not ask whether they “like it.” Watch behavior.

Good signal:

```txt
3 out of 5 parents use it multiple times per day without reminders.
```

Bad signal:

```txt
They try it once, forget it exists, or keep asking for features before using the core loop.
```

## Safety wording

Keep this line in replies:

```txt
Not medical advice. Use your pediatrician for health concerns.
```

This tool should only support general nap timing. It should not answer health, feeding, breathing, dehydration, fever, rash, or medical questions.

## Production hardening later

Only after real usage signal:

- Replace JSON file with Supabase, Redis, SQLite, or Postgres
- Add Twilio request signature validation
- Add paid access with Stripe
- Add trial expiration
- Add scheduled wind-down reminders
- Add parent-friendly onboarding page
- Add opt-out handling: STOP, UNSUBSCRIBE
