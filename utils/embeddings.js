const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

class EmbeddingModel {
  constructor(
    modelName = "sentence-transformers/all-MiniLM-L6-v2",
    apiKey = null
  ) {
    this.modelName = modelName;
    this.apiKey = apiKey;
    this.baseUrl =
      "https://api-inference.huggingface.co/pipeline/feature-extraction";
    this.embeddingDimension = 384; // Default for all-MiniLM-L6-v2
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async embedText(text) {
    if (!text || !text.trim()) {
      return new Array(this.embeddingDimension).fill(0);
    }

    // Clean and truncate text
    const cleanText = text.substring(0, 10000);

    try {
      const response = await axios.post(
        this.baseUrl,
        {
          inputs: cleanText,
          model: this.modelName,
          options: {
            wait_for_model: true,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (response.data && Array.isArray(response.data)) {
        return response.data.flat();
      } else {
        throw new Error("Invalid response format from HuggingFace API");
      }
    } catch (error) {
      console.error("Error generating embedding:", error.message);

      // Fallback: Return random embeddings (for testing only)
      // In production, you might want to use a local model or different fallback
      console.warn("Using fallback embedding generation");
      return this._generateFallbackEmbedding(cleanText);
    }
  }

  /**
   * Generate embeddings for a batch of texts
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} Array of embedding vectors
   */
  async embedBatch(texts) {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Process sequentially to avoid rate limiting
    const embeddings = [];
    for (const text of texts) {
      const embedding = await this.embedText(text);
      embeddings.push(embedding);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return embeddings;
  }

  /**
   * Generate fallback embedding using simple hashing (for testing)
   * @param {string} text - Text to embed
   * @returns {number[]} Fallback embedding
   */
  _generateFallbackEmbedding(text) {
    // Simple hash-based fallback embedding
    const embedding = new Array(this.embeddingDimension).fill(0);

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = charCode % this.embeddingDimension;
      embedding[index] = (embedding[index] + 1) % 1.0; // Normalize
    }

    return embedding;
  }

  /**
   * Get embedding dimension
   * @returns {number} Embedding dimension
   */
  get dimension() {
    return this.embeddingDimension;
  }
}

/**
 * Generate response using Gemini LLM
 * @param {string} query - User query
 * @param {string[]} context - Retrieved context chunks
 * @param {string} apiKey - Gemini API key
 * @param {string} modelName - Gemini model name (default: gemini-1.5-flash)
 * @returns {Promise<string>} Generated answer
 */
async function generateResponse(
  query,
  context,
  apiKey,
  modelName = "gemini-1.5-flash"
) {
  try {
    // Configure Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Prepare context
    const contextText = context
      .map((chunk, i) => `Context ${i + 1}: ${chunk}`)
      .join("\n\n");

    // Create prompt
    const prompt = `Based on the following context, answer the question. 
If the context doesn't contain relevant information, say "I don't have enough information to answer this question."

Context:
${contextText}

Question: ${query}

Answer:`;

    // Generate response
    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text();
  } catch (error) {
    console.error("Error generating response with Gemini:", error.message);
    return `Error generating response: ${error.message}`;
  }
}

module.exports = {
  EmbeddingModel,
  generateResponse,
};
