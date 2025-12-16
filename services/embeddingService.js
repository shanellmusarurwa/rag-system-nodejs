const axios = require("axios");

const HF_API_KEY = process.env.HF_API_KEY;
const EMBED_MODEL_NAME = process.env.EMBED_MODEL_NAME;

async function embedTexts(texts) {
  const response = await axios.post(
    `https://api-inference.huggingface.co/embeddings/${EMBED_MODEL_NAME}`,
    { inputs: texts },
    {
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

module.exports = { embedTexts };
