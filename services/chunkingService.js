const fs = require("fs");

function semanticChunk(text, chunkSize) {
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }

  return chunks;
}

module.exports = { semanticChunk };
