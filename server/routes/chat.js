const express = require("express");
const router = express.Router();

import { googleSearch } from "../services/google.js";
import { askGeminiWithSearch } from "../services/gemini.js";

function shouldUseSearch(message) {
  const text = message.toLowerCase();

  return (
    text.includes("сегодня") ||
    text.includes("сейчас") ||
    text.includes("новости") ||
    text.includes("актуаль") ||
    text.includes("последн") ||
    text.includes("что такое") ||
    text.includes("кто такой") ||
    text.includes("кто такая") ||
    text.includes("найди") ||
    text.includes("поищи") ||
    text.includes("цена") ||
    text.includes("курс") ||
    text.includes("погода")
  );
}

router.post("/", async (req, res) => {
  try {
    const { message, useSearch } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    let searchResults = [];

    if (useSearch || shouldUseSearch(message)) {
      searchResults = await googleSearch(message);
    }

    const answer = await askGeminiWithSearch(message, searchResults);

    res.json({
      answer,
      sources: searchResults
    });
  } catch (error) {
    console.error("Chat route error:", error);

    res.status(500).json({
      error: error.message || "Server error"
    });
  }
});

module.exports = router;