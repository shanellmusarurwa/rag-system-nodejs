const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const { semanticChunk } = require("../services/chunkingService");
const { embedTexts } = require("../services/embeddingService");
const { storeChunks } = require("../services/chromaService");

const router = express.Router();
const CHUNK_LENGTH = parseInt(process.env.CHUNK_LENGTH, 10);

// Multer config
const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    const filePath = path.join(__dirname, "..", req.file.path);
    const content = fs.readFileSync(filePath, "utf-8");

    // 1️⃣ Semantic chunking
    const chunks = semanticChunk(content, CHUNK_LENGTH);

    // 2️⃣ Embeddings
    const embeddings = await embedTexts(chunks);

    // 3️⃣ Prepare Chroma payload
    const ids = chunks.map((_, i) => `${req.file.filename}-${i}`);
    const metadatas = chunks.map((_, i) => ({
      source: req.file.originalname,
      chunk_index: i,
    }));

    // 4️⃣ Store in Chroma
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
