import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import uploadRoutes from "./routes/uploadRoutes.js";
import serviceManagerRoutes from "./routes/serviceManagerRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Register routes
app.use("/api", uploadRoutes);
app.use("/api/service-manager", serviceManagerRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => console.error(err));

app.listen(5000, () => console.log("🚀 Server running on port 5000"));
