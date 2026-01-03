require("dotenv").config();

const config = {
  // API Keys
  HF_API_KEY: process.env.HF_API_KEY || "free",
  EMBED_MODEL_NAME: process.env.EMBED_MODEL_NAME || "Xenova/all-MiniLM-L6-v2",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  LLM_MODEL_NAME: process.env.LLM_MODEL_NAME || "gemini-2.5-flash",

  // ChromaDB Configuration
  CHROMA_DB_PATH: process.env.CHROMA_DB_PATH || "./chroma-data",
  CHROMA_COLLECTION: process.env.CHROMA_COLLECTION || "rag_documents",

  // Application Settings
  RAG_DATA_DIR: process.env.RAG_DATA_DIR || "./uploads",
  CHUNK_LENGTH: parseInt(process.env.CHUNK_LENGTH) || 500,
  PORT: parseInt(process.env.PORT) || 3000,
};

// Validate critical configuration
if (!config.GEMINI_API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY is required in .env file");
  console.log(
    "💡 Get a free API key from: https://makersuite.google.com/app/apikey"
  );
  process.exit(1);
}

// Warn about common mistakes
if (config.GEMINI_API_KEY.startsWith("sk-")) {
  console.error("❌ ERROR: You are using an OpenAI API key, not a Gemini key!");
  console.log(
    "💡 Get a Gemini key from: https://makersuite.google.com/app/apikey"
  );
  process.exit(1);
}

module.exports = config;
