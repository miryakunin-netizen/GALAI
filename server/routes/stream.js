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
    res.setHeader("Transfer-Encoding", "chunked");

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:streamGenerateContent`;

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
            parts: [
              {
                text: message
              }
            ]
          }
        ]
      })
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      throw new Error(err);
    }

    const reader = geminiRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      const matches = chunk.match(/"text"\s*:\s*"([^"]*)"/g) || [];

      for (const match of matches) {
        const text = match
          .replace(/"text"\s*:\s*"/, "")
          .replace(/"$/, "")
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"');

        res.write(text);
      }
    }

    res.end();

  } catch (e) {
    res.write("\n\nОшибка Streaming: " + e.message);
    res.end();
  }
});

export default router;
