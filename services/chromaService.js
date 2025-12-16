const axios = require("axios");

const CHROMA_DB_HOST = process.env.CHROMA_DB_HOST;
const COLLECTION = "rag_documents";

const baseURL = CHROMA_DB_HOST.startsWith("http")
  ? CHROMA_DB_HOST
  : `http://${CHROMA_DB_HOST}`;

async function ensureCollection() {
  try {
    await axios.get(`${baseURL}/collections/${COLLECTION}`);
  } catch {
    await axios.post(`${baseURL}/collections`, { name: COLLECTION });
  }
}

async function storeChunks(ids, embeddings, documents, metadatas) {
  await ensureCollection();
  await axios.post(`${baseURL}/collections/${COLLECTION}/add`, {
    ids,
    embeddings,
    documents,
    metadatas,
  });
}

module.exports = { storeChunks };
