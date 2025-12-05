const config = require("../config/config");
const { generateResponse } = require("../utils/embeddings");

/**
 * Query the RAG system
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const queryDocuments = async (req, res, next) => {
  try {
    const { query, top_k = 5 } = req.body;

    if (!query || typeof query !== "string" || query.trim() === "") {
      return res.status(400).json({
        error: "Query is required and must be a non-empty string",
      });
    }

    const validatedTopK = Math.min(Math.max(parseInt(top_k), 1), 20);

    // Get vector store from app context
    const vectorStore = req.app.get("vectorStore");

    // Retrieve relevant chunks
    const results = await vectorStore.search(query, validatedTopK);

    if (!results || !results.documents || results.documents.length === 0) {
      return res.status(200).json({
        answer: "No relevant information found in the knowledge base.",
        sources: [],
        context: [],
        query: query,
        top_k: validatedTopK,
      });
    }

    // Prepare context from retrieved chunks
    const contextChunks = results.documents[0] || [];
    const sources = results.metadatas ? results.metadatas[0] || [] : [];

    // Generate response using Gemini
    const answer = await generateResponse(
      query,
      contextChunks,
      config.GEMINI_API_KEY,
      config.LLM_MODEL_NAME
    );

    return res.status(200).json({
      answer: answer,
      sources: sources,
      context: contextChunks,
      query: query,
      top_k: validatedTopK,
      distances: results.distances ? results.distances[0] : [],
    });
  } catch (error) {
    console.error("Error processing query:", error);
    next(error);
  }
};

/**
 * Health check endpoint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const healthCheck = (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "semantic-chunking-rag",
    timestamp: new Date().toISOString(),
    configuration: {
      embed_model: config.EMBED_MODEL_NAME,
      llm_model: config.LLM_MODEL_NAME,
      chunk_length: config.CHUNK_LENGTH,
    },
  });
};

/**
 * System information endpoint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const systemInfo = async (req, res) => {
  try {
    const vectorStore = req.app.get("vectorStore");
    const stats = await vectorStore.getStats();

    res.status(200).json({
      system: "Semantic Chunking RAG System",
      version: "1.0.0",
      stats: stats,
      configuration: {
        embed_model: config.EMBED_MODEL_NAME,
        llm_model: config.LLM_MODEL_NAME,
        chunk_length: config.CHUNK_LENGTH,
        data_dir: config.RAG_DATA_DIR,
        chroma_host: config.CHROMA_DB_HOST,
        port: config.PORT,
      },
      endpoints: {
        health: "/api/health",
        upload: "/api/upload",
        query: "/api/query",
        stats: "/api/stats",
        info: "/api/info",
        reset: "/api/reset",
      },
    });
  } catch (error) {
    console.error("Error getting system info:", error);
    res.status(500).json({ error: "Failed to get system information" });
  }
};

module.exports = {
  queryDocuments,
  healthCheck,
  systemInfo,
};
