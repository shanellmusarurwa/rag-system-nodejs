// main.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");

const documentRoutes = require("./routes/documentRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// static for uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// mount routes
app.use("/documents", documentRoutes);

// global error handler for multer and other errors
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (err.name === "MulterError")
    return res.status(400).json({ error: err.message });
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
