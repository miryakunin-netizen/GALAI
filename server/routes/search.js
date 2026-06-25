import express from "express";
import { googleSearch } from "../services/google.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const results = await googleSearch(query);

    res.json({
      query,
      results
    });
  } catch (error) {
    console.error("Search route error:", error);
    res.status(500).json({
      error: error.message || "Search failed"
    });
  }
});

export default router;