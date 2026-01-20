const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB (portfolio DB)"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to AngiSoft Technologies API - Innovative Software Solutions");
});

// Route modules
app.use("/api/about", require("./routes/about"));
app.use("/api/contacts", require("./routes/contacts"));
app.use("/api/education", require("./routes/education"));
app.use("/api/experience", require("./routes/experience"));
app.use("/api/hobbies", require("./routes/hobbies"));
app.use("/api/interests", require("./routes/interests"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/qoutes", require("./routes/qoutes"));
app.use("/api/services", require("./routes/services"));
app.use("/api/skills", require("./routes/skills"));
app.use("/api/social_media_handles", require("./routes/social_media_handles"));
app.use("/api/testimonials", require("./routes/testimonials"));
app.use('/api/admin', require('./routes/adminAuth'));
app.use('/api/admin', require('./routes/adminUsers'));
app.use('/api/admin', require('./routes/adminFiles'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin-messages', require('./routes/adminMessages'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/version', require('./routes/version'));
app.use('/api/settings', require('./routes/settings'));

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
