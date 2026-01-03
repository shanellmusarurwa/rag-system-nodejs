const fs = require("fs-extra");

class DocumentProcessor {
  constructor() {
    this.supportedExtensions = [".txt", ".md", ".json"];
  }

  async readFile(filePath) {
    try {
      const ext = filePath.toLowerCase().slice(-4);

      if (
        !this.supportedExtensions.includes(ext) &&
        !filePath.toLowerCase().endsWith(".txt")
      ) {
        throw new Error(`Unsupported file type: ${ext}`);
      }

      const content = await fs.readFile(filePath, "utf-8");

      if (!content || content.trim().length === 0) {
        throw new Error("File is empty");
      }

      return content;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
      throw error;
    }
  }
}

module.exports = DocumentProcessor;
