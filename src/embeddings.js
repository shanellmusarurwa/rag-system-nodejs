const { pipeline } = require("@xenova/transformers");

class EmbeddingModel {
  constructor(modelName = "Xenova/all-MiniLM-L6-v2") {
    this.modelName = modelName;
    this.model = null;
    this.isReady = false;
    this.initializing = false;
  }

  async initialize() {
    if (this.isReady) return;
    if (this.initializing) {
      // Wait for initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.initialize();
    }

    this.initializing = true;
    try {
      console.log(`📦 Loading embedding model: ${this.modelName}...`);
      this.model = await pipeline("feature-extraction", this.modelName, {
        quantized: true,
        progress_callback: (data) => {
          if (data.status === "ready") {
            console.log("✅ Embedding model loaded");
          }
        },
      });
      this.isReady = true;
    } catch (error) {
      console.error("❌ Failed to load embedding model:", error.message);
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  async getEmbedding(text) {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      const result = await this.model(text, {
        pooling: "mean",
        normalize: true,
      });

      return Array.from(result.data);
    } catch (error) {
      console.error("Embedding generation error:", error.message);
      // Return a simple fallback embedding
      return Array(384).fill(0.1); // Default dimension for all-MiniLM-L6-v2
    }
  }
}

module.exports = EmbeddingModel;
