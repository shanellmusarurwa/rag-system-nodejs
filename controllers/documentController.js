const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const config = require("../config/config");
const SemanticChunker = require("../utils/chunking");

// Initialize chunker
const chunker = new SemanticChunker(config.CHUNK_LENGTH);

/**
 * Process uploaded document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    const file = req.file;
    const originalFilename = file.originalname;
    const savedFilePath = file.path;
    const docId = path.basename(savedFilePath).split(".")[0];

    // Read file content
    let content;
    try {
      content = await fs.readFile(savedFilePath, "utf-8");
    } catch (readError) {
      console.error("Error reading file:", readError);
      return res.status(500).json({
        error: "Failed to read uploaded file",
      });
    }

    // Semantic chunking
    const chunks = chunker.chunkText(content);

    // Get vector store from app context
    const vectorStore = req.app.get("vectorStore");

    // Prepare metadata for each chunk
    const metadatas = chunks.map(() => ({
      document_id: docId,
      filename: originalFilename,
      chunk_index: chunks.indexOf(chunk),
    }));

    // Add to vector store
    await vectorStore.addDocuments(chunks, metadatas);

    return res.status(200).json({
      document_id: docId,
      filename: originalFilename,
      chunks_count: chunks.length,
      message: "Document processed successfully",
      chunk_length: config.CHUNK_LENGTH,
    });
  } catch (error) {
    console.error("Error processing document:", error);
    next(error);
  }
};

/**
 * Get upload statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUploadStats = async (req, res) => {
  try {
    const vectorStore = req.app.get("vectorStore");
    const stats = await vectorStore.getStats();

    res.status(200).json({
      stats: stats,
      configuration: {
        chunk_length: config.CHUNK_LENGTH,
        embed_model: config.EMBED_MODEL_NAME,
        data_dir: config.RAG_DATA_DIR,
      },
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({ error: "Failed to get statistics" });
  }
};

/**
 * Reset vector store
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetVectorStore = async (req, res) => {
  try {
    const vectorStore = req.app.get("vectorStore");
    await vectorStore.reset();

    res.status(200).json({
      message: "Vector store reset successfully",
      collection: vectorStore.collectionName,
    });
  } catch (error) {
    console.error("Error resetting vector store:", error);
    res.status(500).json({ error: "Failed to reset vector store" });
  }
};

module.exports = {
  uploadDocument,
  getUploadStats,
  resetVectorStore,
};
