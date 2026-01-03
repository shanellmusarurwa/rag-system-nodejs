require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGeminiKey() {
  const apiKey = process.env.GEMINI_API_KEY;

  console.log("🔑 Testing Gemini API Key...");
  console.log(
    "Key (first 20 chars):",
    apiKey ? apiKey.substring(0, 20) + "..." : "NOT FOUND"
  );

  if (!apiKey || apiKey === "YOUR_ACTUAL_KEY_HERE") {
    console.error("❌ ERROR: Please set your GEMINI_API_KEY in .env file");
    console.log("💡 Get it from: https://makersuite.google.com/app/apikey");
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    console.log("⏳ Testing connection to Gemini API...");
    const result = await model.generateContent("Hello");
    const response = await result.response;

    console.log("✅ SUCCESS! Gemini API is working!");
    console.log("Test response:", response.text());
  } catch (error) {
    console.error("❌ FAILED:", error.message);

    if (error.message.includes("API key not valid")) {
      console.log("\n💡 SOLUTIONS:");
      console.log("1. Make sure you copied the ENTIRE key");
      console.log("2. Keys should start with: AIzaSy");
      console.log(
        "3. Try generating a new key at: https://makersuite.google.com/app/apikey"
      );
      console.log("4. Make sure there are no spaces or extra characters");
    }
  }
}

testGeminiKey();
