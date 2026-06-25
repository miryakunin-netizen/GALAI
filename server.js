import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname, { extensions: ['html'] }));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Missing q parameter' });

    const key = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;
    if (key && cx) {
      const params = new URLSearchParams({ key, cx, q, num: '7', safe: 'active', lr: 'lang_ru' });
      const r = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Google Search API error', details: data });
      return res.json({ source: 'Google', items: (data.items || []).map(item => ({
        title: item.title, link: item.link, snippet: item.snippet, displayLink: item.displayLink
      })) });
    }

    const ddg = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`);
    const d = await ddg.json();
    const items = [];
    if (d.AbstractText) items.push({ title: d.Heading || q, link: d.AbstractURL || '', snippet: d.AbstractText, displayLink: d.AbstractSource || 'DuckDuckGo' });
    for (const topic of (d.RelatedTopics || []).slice(0, 7)) {
      if (topic.Text) items.push({ title: topic.Text.split(' - ')[0], link: topic.FirstURL || '', snippet: topic.Text, displayLink: 'DuckDuckGo' });
    }
    res.json({ source: 'DuckDuckGo', items });
  } catch (err) { res.status(500).json({ error: err.message || 'Unknown error' }); }
});

app.listen(PORT, () => console.log(`GALAI running on port ${PORT}`));
