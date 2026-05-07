import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonStore } from './store.js';
import { handleSms } from './bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const store = new JsonStore();
const port = Number(process.env.PORT || 3000);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, name: 'wake-window-sms-bot' });
});

app.post('/sms/twilio', async (req, res) => {
  try {
    const body = req.body.Body || '';
    const from = req.body.From || req.body.FromCountry || 'local-test-user';
    const message = await handleSms({ body, from, store });

    res.type('text/xml');
    res.send(twiml(message));
  } catch (error) {
    console.error('SMS webhook error:', error);
    res.type('text/xml');
    res.status(200).send(twiml('Something broke on my side. Try again or text HELP.'));
  }
});

// Local browser test endpoint. This is not used by Twilio.
app.post('/api/test-sms', async (req, res) => {
  try {
    const message = await handleSms({
      body: req.body.body || '',
      from: req.body.from || '+15555550123',
      store
    });
    res.json({ reply: message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process test message' });
  }
});

// Serve built Vite site in production after `npm run build`.
const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/sms/') || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (error) => {
    if (error) res.status(404).send('Build the landing page first with npm run build.');
  });
});

app.listen(port, () => {
  console.log(`Wake Window SMS Bot listening on http://localhost:${port}`);
});

function twiml(message) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
