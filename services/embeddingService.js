const { pipeline } = require("@xenova/transformers");

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    console.log("🔄 Loading embedding model...");
    embedder = await pipeline(
      "feature-extraction",
      process.env.EMBED_MODEL_NAME
    );
    console.log("✅ Embedding model loaded");
  }
  return embedder;
}

async function embedTexts(texts) {
  const model = await getEmbedder();

  const embeddings = [];
  for (const text of texts) {
    const output = await model(text, {
      pooling: "mean",
      normalize: true,
    });
    embeddings.push(Array.from(output.data));
  }

  return embeddings;
}

module.exports = { embedTexts };
