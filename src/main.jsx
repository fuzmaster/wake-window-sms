import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  const [phone, setPhone] = useState('+15555550123');
  const [body, setBody] = useState('AGE 13 WEEKS');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendTest(event) {
    event.preventDefault();
    setLoading(true);
    setReply('');
    try {
      const response = await fetch('/api/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: phone, body })
      });
      const data = await response.json();
      setReply(data.reply || data.error || 'No reply');
    } catch (error) {
      setReply('Could not reach local server. Run npm run dev:server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">48-hour parenting MVP</p>
        <h1>Wake Window SMS Bot</h1>
        <p className="subhead">
          A tiny SMS assistant for exhausted parents. Text <strong>UP</strong> when the baby wakes. Get the next nap target and wind-down time instantly.
        </p>
        <div className="cta-row">
          <a href="#test" className="button">Test locally</a>
          <a href="#commands" className="button secondary">View commands</a>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Core behavior</h2>
          <p>Parents do not open a dashboard. They text one word and get a useful answer.</p>
          <div className="phone-card">
            <p className="bubble user">UP</p>
            <p className="bubble bot">Next nap target: 9:15 AM.<br />Start winding down: 9:00 AM.</p>
          </div>
        </article>

        <article className="card" id="commands">
          <h2>SMS commands</h2>
          <ul>
            <li><code>AGE 13 WEEKS</code> saves the baby's age.</li>
            <li><code>UP</code> logs wake time as now.</li>
            <li><code>UP 7:15</code> overrides wake time.</li>
            <li><code>DOWN</code> logs sleep start.</li>
            <li><code>TZ America/New_York</code> sets timezone.</li>
            <li><code>STATUS</code>, <code>HELP</code>, <code>RESET</code>.</li>
          </ul>
        </article>
      </section>

      <section className="card tester" id="test">
        <h2>Local test console</h2>
        <p>This simulates Twilio hitting your webhook. Use the same fake phone number to keep the same saved state.</p>
        <form onSubmit={sendTest}>
          <label>
            Test phone number
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label>
            Incoming SMS body
            <input value={body} onChange={(event) => setBody(event.target.value)} placeholder="UP" />
          </label>
          <button disabled={loading}>{loading ? 'Sending...' : 'Send test SMS'}</button>
        </form>
        {reply && (
          <pre className="reply">{reply}</pre>
        )}
      </section>

      <section className="card warning">
        <h2>Important safety copy</h2>
        <p>This is not medical advice. It gives general nap timing support based on age ranges. Parents should contact their pediatrician for health, feeding, breathing, fever, dehydration, or developmental concerns.</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
