# GALAI 3.1 — Gemini API

Эта версия добавляет Gemini API на backend.

## Railway Variables

Добавь в Railway → Project → Variables:

```env
GEMINI_API_KEY=твой_ключ_Gemini
GOOGLE_API_KEY=твой_ключ_Google_Search_если_есть
GOOGLE_CX=твой_CX_если_есть
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_FALLBACK_MODEL=gemini-2.5-flash
```

Минимально нужен только:

```env
GEMINI_API_KEY=твой_ключ
```

Если `GOOGLE_API_KEY` и `GOOGLE_CX` не добавлены, GALAI будет использовать fallback-поиск через Wikipedia/DuckDuckGo.

## Запуск локально

```bash
npm install
npm start
```

Открой:

```text
http://localhost:3000
```

## Структура

```text
server.js
package.json
public/
  index.html
  app.js
  styles.css
  manifest.json
  service-worker.js
  icons/
```
