// routes/documentRoutes.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const documentController = require("../controllers/documentController");

// POST /documents/upload - single file field named 'file'
router.post(
  "/upload",
  upload.single("file"),
  documentController.uploadDocument
);

// GET /documents/uploads
router.get("/uploads", documentController.listUploads);

module.exports = router;
