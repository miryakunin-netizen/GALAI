import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import uploadRoute from "./server/routes/upload.js";
import filesRoute from "./server/routes/files.js";
import { memory } from "./server/memory/memory.js";
import streamRoute from "./server/routes/stream.js";
import multer from "multer";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.get("/api/check", (req, res) => {
  res.json({
    ok: true,
    gemini: !!process.env.GEMINI_API_KEY,
    googleApi: !!process.env.GOOGLE_API_KEY,
    googleCx: !!process.env.GOOGLE_CX
  });
});
const PORT = process.env.PORT || 3000;

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';
const GOOGLE_RESULTS = process.env.GOOGLE_RESULTS || '6';

app.use(express.json({ limit: '2mb' }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024
  }
});
app.use("/api/upload", uploadRoute);
app.use("/api/files", filesRoute);
app.get("/api/check", (req, res) => {
  res.json({
    ok: true,
    gemini: Boolean(process.env.GEMINI_API_KEY),
    googleApi: Boolean(process.env.GOOGLE_API_KEY),
    googleCx: Boolean(process.env.GOOGLE_CX)
  });
});
app.use(express.static(path.join(__dirname, 'public')));
app.use("/api/chat/stream", streamRoute);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    version: '3.1',
    gemini: Boolean(process.env.GEMINI_API_KEY),
    googleSearch: Boolean(process.env.GOOGLE_API_KEY && process.env.GOOGLE_CX),
    model: GEMINI_MODEL
  });
});

async function wikipediaSearch(q) {
  const searchUrl = `https://ru.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=3&namespace=0&format=json&origin=*`;
  const s = await fetch(searchUrl);
  if (!s.ok) return [];
  const data = await s.json();
  const titles = data?.[1] || [];
  const urls = data?.[3] || [];
  const out = [];
  for (let i = 0; i < titles.length; i++) {
    try {
      const sum = await fetch(`https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titles[i])}`);
      if (!sum.ok) continue;
      const sd = await sum.json();
      out.push({
        title: sd.title || titles[i],
        snippet: sd.extract || '',
        link: sd?.content_urls?.desktop?.page || urls[i] || '',
        source: 'Wikipedia'
      });
    } catch {}
  }
  return out.filter(x => x.snippet);
}

async function googleSearch(q) {
  const key = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;
  if (!key || !cx) return [];
  const params = new URLSearchParams({ key, cx, q, num: GOOGLE_RESULTS, safe: 'active', hl: 'ru' });
  const r = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || 'Google Search API error');
  return (data.items || []).map(item => ({
    title: item.title,
    snippet: item.snippet,
    link: item.link,
    source: item.displayLink || 'Google'
  }));
}

async function duckDuckGo(q) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const d = await r.json();
    const text = d.AbstractText || d.Answer || d.Definition;
    if (!text) return [];
    return [{ title: d.Heading || q, snippet: text, link: d.AbstractURL || '', source: d.AbstractSource || 'DuckDuckGo' }];
  } catch { return []; }
}

async function findSources(q) {
  let results = [];
  try { results = await googleSearch(q); } catch (e) { console.error('Google search:', e.message); }
  if (!results.length) results = await wikipediaSearch(q);
  if (!results.length) results = await duckDuckGo(q);
  return results;
}

app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Введите запрос' });
    const results = await findSources(q);
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Ошибка поиска' });
  }
});

function buildFallbackAnswer(q, results) {
  if (!results?.length) {
    return `Я пока не нашёл информацию по запросу: «${q}».\n\nПроверь переменные Railway: GEMINI_API_KEY, GOOGLE_API_KEY и GOOGLE_CX.`;
  }
  const first = results[0];
  const extra = results.slice(1, 5).map((r, i) => `${i + 2}. ${r.title} — ${r.link}`).join('\n');
  return `${first.snippet}\n\nИсточники:\n1. ${first.title} — ${first.link}${extra ? '\n' + extra : ''}`;
}

function toGeminiHistory(history = []) {
  return history
    .filter(m => m && typeof m.text === 'string' && ['user', 'assistant'].includes(m.role))
    .slice(-10)
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text.slice(0, 4000) }]
    }));
}

async function callGeminiModel(model, message, history, results) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const context = (results || [])
    .slice(0, 8)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\n${r.link}`)
    .join('\n\n');

  const systemInstruction = `Ты GALAI 4.0 — дружелюбный русскоязычный ИИ-помощник.

Твой стиль:
- говори понятно, спокойно и по делу;
- будь дружелюбным, но не соглашайся автоматически;
- если пользователь ошибается, мягко объясни ошибку и предложи правильный вариант;
- помни контекст текущего диалога и ссылайся на предыдущие сообщения, если это помогает;
- не выдумывай факты;
- если информации не хватает, честно скажи об этом;
- если есть источники, используй их и в конце добавь короткий список ссылок.

Главная задача: помогать пользователю думать, принимать решения и делать работу быстрее.`;

  const contents = [
    ...toGeminiHistory(history),
    {
      role: 'user',
      parts: [{
        text: `${context ? `Источники из интернета:\n${context}\n\n` : ''}Вопрос пользователя: ${message}`
      }]
    }
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': key
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 2048
      }
    })
  });

  const data = await r.json();

  if (!r.ok) {
    throw new Error(data?.error?.message || `Gemini API error (${model})`);
  }

  return data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n').trim() || null;
}

async function askGemini(message, history, results) {
  if (!process.env.GEMINI_API_KEY) return null;

  try {
    return await callGeminiModel(GEMINI_MODEL, message, history, results);
  } catch (e) {
    console.error('Gemini primary:', e.message);

    if (GEMINI_FALLBACK_MODEL && GEMINI_FALLBACK_MODEL !== GEMINI_MODEL) {
      try {
        return await callGeminiModel(GEMINI_FALLBACK_MODEL, message, history, results);
      } catch (e2) {
        console.error('Gemini fallback:', e2.message);
      }
    }

    return null;
  }
}

app.post('/api/chat', async (req, res) => {
  try {
    const message = String(req.body.message || '').trim();
    const history = Array.isArray(req.body.history) ? req.body.history : [];
    const useSearch = req.body.useSearch !== false;

    if (!message) {
      return res.status(400).json({ error: 'Пустое сообщение' });
    }

    const userId = req.ip || "anonymous";
    memory.save(userId, "user", message);

    const results = useSearch ? await findSources(message) : [];

    let answer = await askGemini(message, history, results);
    let mode = 'gemini';

    if (!answer) {
      mode = 'fallback';
      answer = buildFallbackAnswer(message, results);
    }

    memory.save(userId, "assistant", answer);

    res.json({
      answer,
      sources: results.slice(0, 8),
      mode,
      model: process.env.GEMINI_API_KEY ? GEMINI_MODEL : null
    });

  } catch (e) {
    res.status(500).json({
      error: e.message || 'Ошибка GALAI'
    });
  }
});

app.post("/api/upload", upload.single("file"), (req, res) => {

  if (!req.file) {
    return res.status(400).json({
      error: "Файл не загружен"
    });
  }

  res.json({
    ok: true,
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });

});

app.listen(PORT, () => console.log(`GALAI 3.1 running on port ${PORT}`));

