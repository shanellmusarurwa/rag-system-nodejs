const express = require("express");
const router = express.Router();
const {
  queryDocuments,
  healthCheck,
  systemInfo,
} = require("../controllers/queryController");

/**
 * @route POST /api/query
 * @desc Query the RAG system
 * @access Public
 */
router.post("/query", queryDocuments);

/**
 * @route GET /api/health
 * @desc Health check endpoint
 * @access Public
 */
router.get("/health", healthCheck);

/**
 * @route GET /api/info
 * @desc Get system information
 * @access Public
 */
router.get("/info", systemInfo);

module.exports = router;
