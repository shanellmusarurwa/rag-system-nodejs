const express = require("express");
const multer = require("multer");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");

// Load environment FIRST
require("dotenv").config();

// Verify environment variables
console.log("🔍 Checking environment...");
console.log("PORT:", process.env.PORT || "3000 (default)");
console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
console.log(
  "GEMINI_API_KEY starts with:",
  process.env.GEMINI_API_KEY
    ? process.env.GEMINI_API_KEY.substring(0, 10) + "..."
    : "NOT SET"
);

// Validate API key
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === "YOUR_ACTUAL_KEY_HERE" || apiKey.includes("000000")) {
  console.error("\n❌❌❌ CRITICAL ERROR ❌❌❌");
  console.error("GEMINI_API_KEY is not properly set!");
  console.error("\n💡 HOW TO FIX:");
  console.error(
    "1. Get a FREE key from: https://makersuite.google.com/app/apikey"
  );
  console.error("2. Copy the ENTIRE key (starts with AIzaSy...)");
  console.error("3. Edit your .env file and replace YOUR_ACTUAL_KEY_HERE");
  console.error("4. Save the file and restart the server");
  console.error("\nExample .env file content:");
  console.error("GEMINI_API_KEY=AIzaSyDabc123def456ghi789jkl012mno345pqr678");
  process.exit(1);
}

// Now load the config AFTER environment is validated
const config = require("./config");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create necessary directories
fs.ensureDirSync(config.RAG_DATA_DIR);
fs.ensureDirSync("./chroma-data");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.RAG_DATA_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = [".txt", ".md", ".json"];

    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Only text files are allowed (${allowedExts.join(", ")})`));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Lazy initialization
let components = {
  chunker: null,
  embeddingModel: null,
  vectorStore: null,
  llm: null,
  documentProcessor: null,
  isInitialized: false,
};

async function initializeComponents() {
  if (components.isInitialized) return;

  console.log("🔄 Initializing RAG components...");

  try {
    // Dynamically import to handle any initialization errors gracefully
    const SemanticChunker = require("./src/chunking");
    const EmbeddingModel = require("./src/embeddings");
    const VectorStore = require("./src/vectorStore");
    const GeminiLLM = require("./src/llm");
    const DocumentProcessor = require("./src/documentProcessor");

    // Initialize in sequence
    components.embeddingModel = new EmbeddingModel(config.EMBED_MODEL_NAME);
    await components.embeddingModel.initialize();

    components.chunker = new SemanticChunker(config.CHUNK_LENGTH);
    components.vectorStore = new VectorStore(components.embeddingModel);
    await components.vectorStore.connect();

    components.llm = new GeminiLLM();
    await components.llm.initialize();

    components.documentProcessor = new DocumentProcessor();
    components.isInitialized = true;

    console.log("✅ All components initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize components:", error.message);
    throw error;
  }
}

// Health endpoint
app.get("/health", async (req, res) => {
  try {
    const info = {
      status: "running",
      port: config.PORT,
      initialized: components.isInitialized,
      config: {
        embed_model: config.EMBED_MODEL_NAME,
        llm_model: config.LLM_MODEL_NAME,
        chunk_length: config.CHUNK_LENGTH,
        upload_dir: config.RAG_DATA_DIR,
      },
      timestamp: new Date().toISOString(),
    };

    if (components.isInitialized && components.vectorStore) {
      const storeInfo = await components.vectorStore.getCollectionInfo();
      info.vector_store = storeInfo;
    }

    res.json(info);
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

// Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded. Please select a file.",
      });
    }

    const filePath = req.file.path;
    const filename = req.file.originalname;

    console.log(`📤 Processing file: ${filename}`);

    // Initialize components if needed
    if (!components.isInitialized) {
      await initializeComponents();
    }

    // Read file
    const text = await components.documentProcessor.readFile(filePath);
    console.log(`   Read ${text.length} characters`);

    // Create chunks
    const chunks = await components.chunker.chunkText(text, {
      source: filename,
      uploaded_at: new Date().toISOString(),
      file_size: text.length,
    });

    console.log(`   Created ${chunks.length} semantic chunks`);

    // Add to vector store
    await components.vectorStore.addDocuments(chunks);

    // Clean up uploaded file
    await fs.remove(filePath);

    res.json({
      success: true,
      message: `File '${filename}' processed successfully`,
      details: {
        filename,
        chunks_created: chunks.length,
        characters_processed: text.length,
      },
    });
  } catch (error) {
    console.error("❌ Upload error:", error.message);

    // Clean up file if exists
    if (req.file && req.file.path && (await fs.pathExists(req.file.path))) {
      await fs.remove(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: "Failed to process file",
      details: error.message,
    });
  }
});

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { question, top_k = 5 } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Question is required",
      });
    }

    console.log(`💭 Question: "${question}"`);

    // Initialize components if needed
    if (!components.isInitialized) {
      await initializeComponents();
    }

    // Search for relevant documents
    const relevantDocs = await components.vectorStore.search(
      question.trim(),
      top_k
    );

    if (relevantDocs.length === 0) {
      return res.json({
        success: true,
        answer:
          "I don't have enough information to answer this question. Please upload some relevant documents first.",
        sources: [],
        relevant_documents_count: 0,
      });
    }

    console.log(`📚 Found ${relevantDocs.length} relevant documents`);

    // Generate response
    const answer = await components.llm.generateResponse(
      question,
      relevantDocs
    );

    // Extract sources
    const sources = [
      ...new Set(
        relevantDocs.map((doc) => doc.metadata?.source).filter(Boolean)
      ),
    ];

    res.json({
      success: true,
      answer,
      sources,
      relevant_documents_count: relevantDocs.length,
    });
  } catch (error) {
    console.error("❌ Chat error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to generate response",
      details: error.message,
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: "File upload error",
      details: err.message,
    });
  }

  res.status(500).json({
    success: false,
    error: "Internal server error",
    details: err.message,
  });
});

// Start server
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(50));
  console.log("🚀 RAG System Started (No Docker Needed)");
  console.log("=".repeat(50));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📁 Uploads: ${config.RAG_DATA_DIR}`);
  console.log(`🗄️  ChromaDB: ./chroma-data (embedded mode)`);
  console.log(`✂️  Chunk size: ${config.CHUNK_LENGTH} chars`);
  console.log(`🧠 Embeddings: ${config.EMBED_MODEL_NAME}`);
  console.log(`🤖 LLM: ${config.LLM_MODEL_NAME}`);
  console.log("=".repeat(50));
  console.log("\n📋 Endpoints:");
  console.log("   GET  /health  - Check system status");
  console.log("   POST /upload  - Upload documents");
  console.log("   POST /chat    - Ask questions");
  console.log("\n⚡ Ready to use!");
  console.log("=".repeat(50));
});
