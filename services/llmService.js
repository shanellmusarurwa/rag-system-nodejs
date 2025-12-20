const axios = require("axios");

// Basic Gemini call sending prompt + context docs
async function callGemini(prompt, docs) {
  const API_KEY = process.env.GEMINI_API_KEY;
  const MODEL = process.env.LLM_MODEL_NAME;
  const URL = process.env.GEMINI_API_URL;

  const context = docs.join("\n");

  const payload = {
    model: MODEL,
    prompt: `${context}\n\nUser Prompt: ${prompt}`,
    max_output_tokens: parseInt(process.env.LLM_MAX_TOKENS || "512", 10),
  };

  const resp = await axios.post(URL, payload, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  return (
    resp.data.output || resp.data.choices?.map((c) => c.text).join("") || ""
  );
}

module.exports = { callGemini };
