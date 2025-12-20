const axios = require("axios");

const HOST = process.env.CHROMA_DB_HOST;
const COLLECTION = process.env.CHROMA_COLLECTION_NAME || "rag_documents";
const baseURL = HOST.startsWith("http") ? HOST : `http://${HOST}`;

async function ensureCollection() {
  try {
    await axios.get(`${baseURL}/collections/${COLLECTION}`);
  } catch {
    await axios.post(`${baseURL}/collections`, { name: COLLECTION });
  }
}

async function storeChunks(ids, embeddings, docs, metadatas) {
  await ensureCollection();
  await axios.post(`${baseURL}/collections/${COLLECTION}/add`, {
    ids,
    embeddings,
    documents: docs,
    metadatas,
  });
}

async function queryChroma(queryEmbedding, nResults) {
  const resp = await axios.post(`${baseURL}/collections/${COLLECTION}/query`, {
    query_embeddings: [queryEmbedding],
    n_results: nResults,
    include: ["documents", "metadatas", "distances"],
  });
  return resp.data.documents?.[0] || [];
}

module.exports = { storeChunks, queryChroma };
