const natural = require("natural");
const { Tokenizer, WordTokenizer } = natural;

class SemanticChunker {
  constructor(chunkLength = 500, overlap = 50) {
    this.chunkLength = chunkLength;
    this.overlap = overlap;
    this.tokenizer = new WordTokenizer();
    this.sentenceTokenizer = new natural.SentenceTokenizer();
  }

  /**
   * Split text into semantic chunks while preserving sentence boundaries
   * @param {string} text - Input text to chunk
   * @returns {string[]} Array of text chunks
   */
  chunkText(text) {
    if (!text || !text.trim()) {
      return [];
    }

    // Clean text
    const cleanedText = this._cleanText(text);

    // Split into sentences
    const sentences = this.sentenceTokenizer.tokenize(cleanedText);

    const chunks = [];
    let currentChunk = [];
    let currentLength = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.length;

      // If adding this sentence exceeds chunk length (and we already have content)
      if (
        currentLength + sentenceLength > this.chunkLength &&
        currentChunk.length > 0
      ) {
        // Save current chunk
        const chunkText = currentChunk.join(" ");
        chunks.push(chunkText);

        // Start new chunk with overlap
        if (this.overlap > 0) {
          // Keep last few sentences for overlap
          const overlapSentences = [];
          let overlapLength = 0;

          for (let i = currentChunk.length - 1; i >= 0; i--) {
            const s = currentChunk[i];
            if (overlapLength + s.length <= this.overlap) {
              overlapSentences.unshift(s);
              overlapLength += s.length;
            } else {
              break;
            }
          }

          currentChunk = overlapSentences;
          currentLength = overlapLength;
        } else {
          currentChunk = [];
          currentLength = 0;
        }
      }

      // Add sentence to current chunk
      currentChunk.push(sentence);
      currentLength += sentenceLength;
    }

    // Add the last chunk if it has content
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join(" ");
      chunks.push(chunkText);
    }

    // Ensure chunks aren't too small (merge tiny chunks)
    return this._mergeSmallChunks(chunks);
  }

  /**
   * Clean and normalize text
   * @param {string} text - Text to clean
   * @returns {string} Cleaned text
   */
  _cleanText(text) {
    // Replace multiple spaces/newlines/tabs with single space
    let cleaned = text.replace(/\s+/g, " ");

    // Remove excessive punctuation
    cleaned = cleaned.replace(/([.!?])\1+/g, "$1");

    // Trim whitespace
    return cleaned.trim();
  }

  /**
   * Merge chunks that are too small
   * @param {string[]} chunks - Array of text chunks
   * @param {number} minLength - Minimum chunk length (default: 100)
   * @returns {string[]} Merged chunks
   */
  _mergeSmallChunks(chunks, minLength = 100) {
    if (!chunks || chunks.length === 0) {
      return [];
    }

    const mergedChunks = [];
    let buffer = "";

    for (const chunk of chunks) {
      if (buffer.length + chunk.length <= this.chunkLength) {
        if (buffer) {
          buffer = buffer + " " + chunk;
        } else {
          buffer = chunk;
        }
      } else {
        if (buffer) {
          mergedChunks.push(buffer);
        }
        buffer = chunk;
      }
    }

    if (buffer) {
      mergedChunks.push(buffer);
    }

    // Final pass to ensure minimum length
    const finalChunks = [];
    for (const chunk of mergedChunks) {
      if (chunk.length < minLength && finalChunks.length > 0) {
        // Merge with previous chunk if it won't exceed max length
        const lastChunk = finalChunks[finalChunks.length - 1];
        if (lastChunk.length + chunk.length <= this.chunkLength) {
          finalChunks[finalChunks.length - 1] = lastChunk + " " + chunk;
        } else {
          finalChunks.push(chunk);
        }
      } else {
        finalChunks.push(chunk);
      }
    }

    return finalChunks;
  }

  /**
   * Split text by paragraphs as an alternative chunking strategy
   * @param {string} text - Input text
   * @returns {string[]} Paragraph chunks
   */
  chunkByParagraphs(text) {
    if (!text || !text.trim()) {
      return [];
    }

    const cleanedText = this._cleanText(text);
    const paragraphs = cleanedText.split(/\n\s*\n/);

    const chunks = [];
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      const trimmedPara = paragraph.trim();
      if (!trimmedPara) continue;

      if (currentChunk.length + trimmedPara.length > this.chunkLength) {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = trimmedPara;
      } else {
        if (currentChunk) {
          currentChunk = currentChunk + "\n\n" + trimmedPara;
        } else {
          currentChunk = trimmedPara;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}

module.exports = SemanticChunker;
