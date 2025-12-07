// controllers/documentController.js
const path = require("path");
const fs = require("fs");

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    // Save metadata or process file here. For now return path
    return res.json({
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Upload failed" });
  }
};

exports.listUploads = (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadsDir)) return res.json([]);
    const files = fs.readdirSync(uploadsDir);
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not list uploads" });
  }
};
