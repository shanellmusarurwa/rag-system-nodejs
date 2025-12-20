const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { semanticChunk } = require("../services/chunkingService");
const { embedTexts } = require("../services/embeddingService");
const { storeChunks } = require("../services/chromaService");

const router = express.Router();
const CHUNK_LENGTH = parseInt(process.env.CHUNK_LENGTH, 10);

// configure multer upload
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    const filepath = path.join(__dirname, "..", req.file.path);
    const content = fs.readFileSync(filepath, "utf-8");

    // 1) chunking
    const chunks = semanticChunk(content, CHUNK_LENGTH);

    // 2) embeddings
    const embeddings = await embedTexts(chunks);

    // 3) prepare data
    const ids = chunks.map((_, i) => `${req.file.filename}-${i}`);
    const metadatas = chunks.map((_, i) => ({
      source: req.file.originalname,
      chunk_index: i,
    }));

    // 4) store in chroma
    await storeChunks(ids, embeddings, chunks, metadatas);

    res.json({
      message: "Document processed successfully",
      chunks_stored: chunks.length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
