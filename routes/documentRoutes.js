const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  uploadDocument,
  getUploadStats,
  resetVectorStore,
} = require("../controllers/documentController");

/**
 * @route POST /api/upload
 * @desc Upload and process a document
 * @access Public
 */
router.post("/upload", upload.single("file"), uploadDocument);

/**
 * @route GET /api/stats
 * @desc Get vector store statistics
 * @access Public
 */
router.get("/stats", getUploadStats);

/**
 * @route POST /api/reset
 * @desc Reset vector store (delete and recreate)
 * @access Public
 */
router.post("/reset", resetVectorStore);

module.exports = router;
