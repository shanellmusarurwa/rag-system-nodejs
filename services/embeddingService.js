const axios = require("axios");

async function embedTexts(texts) {
  const HF_API_KEY = process.env.HF_API_KEY;
  const model = process.env.EMBED_MODEL_NAME;

  const response = await axios.post(
    `https://api-inference.huggingface.co/embeddings/${model}`,
    { inputs: texts },
    {
      headers: { Authorization: `Bearer ${HF_API_KEY}` },
    }
  );

  return response.data;
}

module.exports = { embedTexts };
