const { ChromaClient } = require("chromadb");
const { v4: uuidv4 } = require("uuid");

class ChromaVectorStore {
  constructor(host, embedder, collectionName = "documents") {
    this.host = host;
    this.embedder = embedder;
    this.collectionName = collectionName;

    this.initializeClient();
  }

  /**
   * Initialize ChromaDB client
   */
  async initializeClient() {
    try {
      if (this.host === "localhost:8000" || this.host.includes("localhost")) {
        // Local persistent storage
        this.client = new ChromaClient({
          path: "./chroma_db",
        });
      } else {
        // Remote ChromaDB
        this.client = new ChromaClient({
          path: `http://${this.host}`,
        });
      }

      // Get or create collection
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { "hnsw:space": "cosine" },
      });

      console.log(`Connected to ChromaDB collection: ${this.collectionName}`);
    } catch (error) {
      console.error("Error initializing ChromaDB:", error.message);

      // Fallback to local persistent storage
      try {
        this.client = new ChromaClient({
          path: "./chroma_db",
        });

        this.collection = await this.client.getOrCreateCollection({
          name: this.collectionName,
          metadata: { "hnsw:space": "cosine" },
        });

        console.log("Using local ChromaDB storage");
      } catch (fallbackError) {
        console.error("Failed to initialize ChromaDB:", fallbackError.message);
        throw fallbackError;
      }
    }
  }

  /**
   * Add documents to the vector store
   * @param {string[]} documents - Array of text documents
   * @param {Object[]} metadatas - Array of metadata objects
   * @returns {Promise<void>}
   */
  async addDocuments(documents, metadatas = null) {
    if (!documents || documents.length === 0) {
      return;
    }

    try {
      // Generate embeddings
      const embeddings = await this.embedder.embedBatch(documents);

      // Generate unique IDs
      const ids = documents.map(() => uuidv4());

      // Prepare metadata
      const preparedMetadatas = metadatas || documents.map(() => ({}));

      // Add timestamp to metadata
      const timestamp = new Date().toISOString();
      preparedMetadatas.forEach((metadata) => {
        metadata.timestamp = timestamp;
      });

      // Add to collection
      await this.collection.add({
        embeddings: embeddings,
        documents: documents,
        metadatas: preparedMetadatas,
        ids: ids,
      });

      console.log(`Added ${documents.length} documents to vector store`);
    } catch (error) {
      console.error("Error adding documents to vector store:", error.message);
      throw error;
    }
  }

  /**
   * Search for similar documents
   * @param {string} query - Search query
   * @param {number} nResults - Number of results to return
   * @returns {Promise<Object>} Search results
   */
  async search(query, nResults = 5) {
    try {
      // Generate query embedding
      const queryEmbedding = await this.embedder.embedText(query);

      // Search in collection
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: nResults,
        include: ["documents", "distances", "metadatas"],
      });

      return results;
    } catch (error) {
      console.error("Error searching vector store:", error.message);
      return { documents: [], distances: [], metadatas: [] };
    }
  }

  /**
   * Get collection statistics
   * @returns {Promise<Object>} Collection statistics
   */
  async getStats() {
    try {
      const count = await this.collection.count();
      return {
        count: count,
        collection: this.collectionName,
        embeddingDimension: this.embedder.dimension,
      };
    } catch (error) {
      console.error("Error getting collection stats:", error.message);
      return { count: 0, collection: this.collectionName };
    }
  }

  /**
   * Delete the collection
   * @returns {Promise<void>}
   */
  async deleteCollection() {
    try {
      await this.client.deleteCollection({ name: this.collectionName });
      console.log(`Deleted collection: ${this.collectionName}`);
    } catch (error) {
      console.error("Error deleting collection:", error.message);
    }
  }

  /**
   * Reset the vector store (delete and recreate)
   * @returns {Promise<void>}
   */
  async reset() {
    try {
      await this.deleteCollection();
    } catch (error) {
      // Collection might not exist
    }

    await this.initializeClient();
  }
}

module.exports = ChromaVectorStore;
