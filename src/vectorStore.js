const { ChromaClient } = require("chromadb");
const { v4: uuidv4 } = require("uuid");

class VectorStore {
  constructor(embeddingModel, collectionName = "rag_documents") {
    this.embeddingModel = embeddingModel;
    this.collectionName = collectionName;
    this.client = null;
    this.collection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      console.log("🔗 Connecting to ChromaDB (embedded mode)...");

      // Embedded mode - no server needed!
      this.client = new ChromaClient({
        path: "./chroma-data", // Local directory for storage
      });

      // Test the connection
      await this.client.heartbeat();
      this.isConnected = true;
      console.log("✅ ChromaDB connected in embedded mode");
    } catch (error) {
      console.error("❌ ChromaDB connection failed:", error.message);
      console.log("💡 Creating local storage...");

      // Fallback to simple in-memory storage
      this.fallbackToMemory();
      this.isConnected = true;
    }
  }

  fallbackToMemory() {
    console.log("📦 Using fallback memory storage");
    this.mode = "memory";
    this.documents = [];
    this.embeddings = [];
    this.metadatas = [];
    this.ids = [];
  }

  async getOrCreateCollection() {
    if (!this.isConnected) {
      await this.connect();
    }

    if (this.mode === "memory") {
      return this;
    }

    try {
      // Try to get existing collection
      this.collection = await this.client.getCollection({
        name: this.collectionName,
      });
    } catch (error) {
      // Create new collection
      this.collection = await this.client.createCollection({
        name: this.collectionName,
        metadata: {
          "hnsw:space": "cosine",
          description: "RAG documents",
          created: new Date().toISOString(),
        },
      });
    }

    return this.collection;
  }

  async addDocuments(chunks) {
    if (!chunks || chunks.length === 0) {
      console.log("⚠️ No chunks to add");
      return;
    }

    console.log(`📤 Adding ${chunks.length} chunks to vector store...`);

    // Memory mode
    if (this.mode === "memory") {
      for (const chunk of chunks) {
        const embedding = await this.embeddingModel.getEmbedding(chunk.text);
        this.ids.push(uuidv4());
        this.documents.push(chunk.text);
        this.metadatas.push(chunk.metadata);
        this.embeddings.push(embedding);
      }
      console.log(`✅ Added ${chunks.length} chunks to memory storage`);
      return;
    }

    // ChromaDB mode
    try {
      const collection = await this.getOrCreateCollection();
      const ids = [];
      const documents = [];
      const metadatas = [];
      const embeddings = [];

      // Process in smaller batches
      const batchSize = 5;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

        for (const chunk of batch) {
          const embedding = await this.embeddingModel.getEmbedding(chunk.text);
          ids.push(uuidv4());
          documents.push(chunk.text);
          metadatas.push({
            ...chunk.metadata,
            chunk_id: uuidv4().slice(0, 8),
            added: new Date().toISOString(),
          });
          embeddings.push(embedding);
        }

        if (ids.length > 0) {
          await collection.add({
            ids,
            embeddings,
            metadatas,
            documents,
          });

          console.log(
            `   Added batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
              chunks.length / batchSize
            )}`
          );

          // Reset for next batch
          ids.length = 0;
          documents.length = 0;
          metadatas.length = 0;
          embeddings.length = 0;
        }
      }

      console.log(`✅ Successfully added ${chunks.length} chunks to ChromaDB`);
    } catch (error) {
      console.error("❌ Failed to add to ChromaDB:", error.message);
      console.log("🔄 Falling back to memory storage...");
      this.fallbackToMemory();
      await this.addDocuments(chunks); // Retry in memory mode
    }
  }

  async search(query, k = 5) {
    console.log(
      `🔍 Searching for: "${query.substring(0, 50)}${
        query.length > 50 ? "..." : ""
      }"`
    );

    // Memory mode
    if (this.mode === "memory") {
      if (!this.documents || this.documents.length === 0) {
        console.log("📭 No documents in storage");
        return [];
      }

      const queryEmbedding = await this.embeddingModel.getEmbedding(query);
      const results = [];

      for (let i = 0; i < this.documents.length; i++) {
        const similarity = this.cosineSimilarity(
          queryEmbedding,
          this.embeddings[i]
        );
        results.push({
          text: this.documents[i],
          metadata: this.metadatas[i],
          score: similarity,
          distance: 1 - similarity,
        });
      }

      results.sort((a, b) => b.score - a.score);
      const topResults = results.slice(0, k);
      console.log(`📚 Found ${topResults.length} relevant documents (memory)`);
      return topResults;
    }

    // ChromaDB mode
    try {
      const collection = await this.getOrCreateCollection();
      const queryEmbedding = await this.embeddingModel.getEmbedding(query);

      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: k,
        include: ["documents", "metadatas", "distances"],
      });

      const documents = results.documents[0] || [];
      const metadatas = results.metadatas[0] || [];
      const distances = results.distances[0] || [];

      console.log(`📚 Found ${documents.length} relevant documents (ChromaDB)`);

      return documents.map((doc, i) => ({
        text: doc,
        metadata: metadatas[i],
        distance: distances[i],
        score: 1 - distances[i],
      }));
    } catch (error) {
      console.error("❌ Search failed:", error.message);
      return [];
    }
  }

  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dot = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async getCollectionInfo() {
    if (this.mode === "memory") {
      return {
        mode: "memory",
        document_count: this.documents?.length || 0,
        status: "connected",
      };
    }

    try {
      const collection = await this.getOrCreateCollection();
      const count = await collection.count();
      return {
        mode: "chromadb",
        document_count: count,
        collection_name: this.collectionName,
        status: "connected",
      };
    } catch (error) {
      return {
        mode: "error",
        error: error.message,
        status: "disconnected",
      };
    }
  }
}

module.exports = VectorStore;
