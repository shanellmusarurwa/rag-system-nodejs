require("dotenv").config();

const config = {
  HF_API_KEY: process.env.HF_API_KEY || "",
  EMBED_MODEL_NAME:
    process.env.EMBED_MODEL_NAME || "sentence-transformers/all-MiniLM-L6-v2",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  LLM_MODEL_NAME: process.env.LLM_MODEL_NAME || "gemini-2.5-flash",
  CHROMA_DB_HOST: process.env.CHROMA_DB_HOST || "localhost:8000",
  RAG_DATA_DIR: process.env.RAG_DATA_DIR || "./data",
  CHUNK_LENGTH: parseInt(process.env.CHUNK_LENGTH) || 500,
  PORT: parseInt(process.env.PORT) || 3000,
};

// Validate required environment variables
const requiredEnvVars = ["GEMINI_API_KEY"];
for (const envVar of requiredEnvVars) {
  if (!config[envVar]) {
    console.warn(`Warning: ${envVar} is not set in environment variables`);
  }
}

module.exports = config;
