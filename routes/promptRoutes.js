const express = require("express");
const { embedTexts } = require("../services/embeddingService");
const { queryChroma } = require("../services/chromaService");
const { callGemini } = require("../services/llmService");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { prompt, top_k = 4 } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    // embed query
    const [qEmbedding] = await embedTexts([prompt]);

    // retrieve
    const docs = await queryChroma(qEmbedding, top_k);

    // generate text with LLM
    const answer = await callGemini(prompt, docs);

    res.json({ answer, retrieved_docs: docs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
