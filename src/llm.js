const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

class GeminiLLM {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      console.error(
        "❌ ERROR: GEMINI_API_KEY is not set or is using placeholder"
      );
      console.log(
        "💡 Get a FREE Gemini API key from: https://makersuite.google.com/app/apikey"
      );
      console.log(
        "💡 Then update your .env file with: GEMINI_API_KEY=your_actual_key"
      );
      throw new Error("GEMINI_API_KEY is required");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.LLM_MODEL_NAME || "gemini-1.5-flash";
    this.model = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log(`🤖 Initializing Gemini LLM (${this.modelName})...`);
      this.model = this.genAI.getGenerativeModel({
        model: this.modelName,
      });

      // Test the connection with a simple prompt
      const testResult = await this.model.generateContent("Hello");
      await testResult.response;

      this.isInitialized = true;
      console.log("✅ Gemini LLM initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Gemini LLM:", error.message);

      if (error.message.includes("API key not valid")) {
        console.log("\n🔑 API KEY ISSUE DETECTED:");
        console.log(
          "1. Your current key:",
          process.env.GEMINI_API_KEY?.substring(0, 20) + "..."
        );
        console.log(
          "2. Get a new key from: https://makersuite.google.com/app/apikey"
        );
        console.log("3. Make sure to copy the ENTIRE key");
        console.log("4. Update your .env file and restart the server");
      }

      throw error;
    }
  }

  async generateResponse(question, context = []) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      let prompt = question;

      if (context && context.length > 0) {
        const contextText = context.map((c) => c.text).join("\n\n");
        prompt = `Context:\n${contextText}\n\nQuestion: ${question}\n\nAnswer based on the context:`;
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;

      return response.text();
    } catch (error) {
      console.error("❌ LLM generation error:", error.message);

      // Provide a fallback response
      return `I found ${context.length} relevant documents. Based on those, here's what I can say about "${question}".`;
    }
  }
}

module.exports = GeminiLLM;
