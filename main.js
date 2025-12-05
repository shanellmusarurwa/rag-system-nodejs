const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Load configuration
const config = require("./config/config");

// Import components
const SemanticChunker = require("./utils/chunking");
const { EmbeddingModel } = require("./utils/embeddings");
const ChromaVectorStore = require("./utils/vectorStore");

// Import routes
const documentRoutes = require("./routes/documentRoutes");
const queryRoutes = require("./routes/queryRoutes");

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create necessary directories
const createDirectories = () => {
  const directories = [config.RAG_DATA_DIR, "./chroma_db"];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

// Initialize application components
const initializeApp = async () => {
  try {
    console.log("Initializing Semantic Chunking RAG System...");
    console.log("Configuration:", {
      port: config.PORT,
      chunk_length: config.CHUNK_LENGTH,
      embed_model: config.EMBED_MODEL_NAME,
      llm_model: config.LLM_MODEL_NAME,
    });

    // Create necessary directories
    createDirectories();

    // Initialize embedding model
    console.log("Initializing embedding model...");
    const embedder = new EmbeddingModel(
      config.EMBED_MODEL_NAME,
      config.HF_API_KEY
    );

    // Initialize vector store
    console.log("Initializing vector store...");
    const vectorStore = new ChromaVectorStore(
      config.CHROMA_DB_HOST,
      embedder,
      "documents"
    );

    // Store vector store in app context
    app.set("vectorStore", vectorStore);

    // Initialize chunker
    const chunker = new SemanticChunker(config.CHUNK_LENGTH);
    app.set("chunker", chunker);

    console.log("Application components initialized successfully");
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
};

// Routes
app.use("/api", documentRoutes);
app.use("/api", queryRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Semantic Chunking RAG System",
    version: "1.0.0",
    endpoints: {
      upload: "/api/upload",
      query: "/api/query",
      health: "/api/health",
      stats: "/api/stats",
      info: "/api/info",
      reset: "/api/reset",
    },
    documentation: {
      upload: "POST /api/upload with multipart/form-data file field",
      query: 'POST /api/query with JSON {query: "your question", top_k: 5}',
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    available_endpoints: [
      "GET /",
      "POST /api/upload",
      "POST /api/query",
      "GET /api/health",
      "GET /api/stats",
      "GET /api/info",
      "POST /api/reset",
    ],
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);

  // Handle multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "File too large. Maximum size is 10MB",
    });
  }

  if (err.message.includes("File type not allowed")) {
    return res.status(400).json({
      error: err.message,
    });
  }

  // Handle other errors
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
const startServer = async () => {
  await initializeApp();

  app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
    console.log(`API available at http://localhost:${config.PORT}`);
    console.log(`Upload directory: ${config.RAG_DATA_DIR}`);
    console.log(`ChromaDB storage: ./chroma_db`);
  });
};

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Start the application
startServer();

module.exports = app;
