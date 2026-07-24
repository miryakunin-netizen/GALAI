import express from "express";

const router = express.Router();

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

function getCurrentDate() {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Krasnoyarsk",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
}

router.post("/", async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({
        error: "Пустое сообщение"
      });
    }

    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      return res.status(500).json({
        error: "GEMINI_API_KEY не задан"
      });
    }

    const currentDate = getCurrentDate();

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(GEMINI_MODEL)}:streamGenerateContent?alt=sse`;

    const geminiRes = await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": key
      },

      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `
Ты GALAI 5.0 — дружелюбный русскоязычный ИИ-помощник.

Текущая дата: ${currentDate}.
Для вопросов о текущей дате, дне недели, месяце или годе используй только эту строку.
Не определяй текущую дату по внутренней памяти модели.
Не спорь с пользователем о текущей дате.

Отвечай понятно, спокойно и по существу.
Не выдумывай факты.
Если достоверной информации недостаточно, честно скажи об этом.
`
            }
          ]
        },

        contents: [
          {
            role: "user",
            parts: [
              {
                text: message
              }
            ]
          }
        ],

        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 2048
        }
      })
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();

      return res.status(geminiRes.status).json({
        error: `Gemini API: ${errorText}`
      });
    }

    res.setHeader(
      "Content-Type",
      "text/plain; charset=utf-8"
    );
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    if (!geminiRes.body) {
      throw new Error("Gemini не вернул поток данных");
    }

    const reader = geminiRes.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, {
        stream: true
      });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith("data:")) {
          continue;
        }

        const jsonText = trimmed.replace(
          /^data:\s*/,
          ""
        );

        if (
          !jsonText ||
          jsonText === "[DONE]"
        ) {
          continue;
        }

        try {
          const data = JSON.parse(jsonText);

          const parts =
            data?.candidates?.[0]?.content?.parts || [];

          for (const part of parts) {
            if (typeof part.text === "string") {
              res.write(part.text);
            }
          }
        } catch (parseError) {
          console.warn(
            "Ошибка разбора SSE:",
            parseError.message
          );
        }
      }
    }

    res.end();
  } catch (error) {
    console.error("STREAM ERROR:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        error:
          error.message ||
          "Ошибка потокового ответа"
      });
    }

    res.write(
      `\n\nОшибка Streaming: ${
        error.message || "Неизвестная ошибка"
      }`
    );
    res.end();
  }
});

export default router;
