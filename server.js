import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Missing q parameter' });
    const key = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;
    if (!key || !cx) return res.status(500).json({ error: 'GOOGLE_API_KEY or GOOGLE_CX is missing' });
    const params = new URLSearchParams({ key, cx, q, num: '7', safe: 'active', lr: 'lang_ru' });
    const r = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Google Search API error', details: data });
    res.json({ items: (data.items || []).map(item => ({ title: item.title, link: item.link, snippet: item.snippet, displayLink: item.displayLink })) });
  } catch (err) { res.status(500).json({ error: err.message || 'Unknown error' }); }
});

app.listen(PORT, () => console.log(`GALAI running on ${PORT}`));
