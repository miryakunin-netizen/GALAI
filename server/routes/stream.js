import express from "express";

const router = express.Router();

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

router.post("/", async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({ error: "Пустое сообщение" });
    }

    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      return res.status(500).json({ error: "GEMINI_API_KEY не задан" });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:streamGenerateContent?alt=sse`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": key
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: message }]
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
      const err = await geminiRes.text();
      throw new Error(err);
    }

    const reader = geminiRes.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith("data:")) continue;

        const jsonText = trimmed.replace(/^data:\s*/, "");

        if (!jsonText || jsonText === "[DONE]") continue;

        try {
          const data = JSON.parse(jsonText);

          const parts =
            data?.candidates?.[0]?.content?.parts || [];

          for (const part of parts) {
            if (part.text) {
              res.write(part.text);
            }
          }
        } catch {
          // неполный chunk — пропускаем
        }
      }
    }

    res.end();

  } catch (e) {
    res.write("\n\nОшибка Streaming: " + e.message);
    res.end();
  }
});

export default router;
