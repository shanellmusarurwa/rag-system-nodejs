class SemanticChunker {
  constructor(chunkLength = 500, overlap = 50) {
    this.chunkLength = chunkLength;
    this.overlap = overlap;
  }

  async chunkText(text, metadata = {}) {
    const chunks = [];

    // Clean text
    text = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();

    if (!text || text.length === 0) {
      return chunks;
    }

    // Split by paragraphs first
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());

    let currentChunk = "";
    let chunkSources = [];

    for (const paragraph of paragraphs) {
      const sentences = this.splitIntoSentences(paragraph);

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length <= this.chunkLength) {
          currentChunk += (currentChunk ? " " : "") + sentence;
          chunkSources.push(sentence);
        } else {
          if (currentChunk.trim()) {
            chunks.push({
              text: currentChunk.trim(),
              metadata: {
                ...metadata,
                chunk_type: "semantic",
                sentences_count: chunkSources.length,
                char_count: currentChunk.length,
              },
            });
          }

          // Start new chunk with overlap
          currentChunk = sentence;
          chunkSources = [sentence];
        }
      }
    }

    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          ...metadata,
          chunk_type: "semantic",
          sentences_count: chunkSources.length,
          char_count: currentChunk.length,
        },
      });
    }

    return chunks;
  }

  splitIntoSentences(text) {
    // Simple sentence splitting
    const sentences = [];
    let current = "";

    for (let i = 0; i < text.length; i++) {
      current += text[i];
      if (
        [".", "!", "?", "\n"].includes(text[i]) &&
        (i === text.length - 1 || [" ", "\n"].includes(text[i + 1]))
      ) {
        const trimmed = current.trim();
        if (trimmed) sentences.push(trimmed);
        current = "";
      }
    }

    if (current.trim()) sentences.push(current.trim());
    return sentences;
  }
}

module.exports = SemanticChunker;
